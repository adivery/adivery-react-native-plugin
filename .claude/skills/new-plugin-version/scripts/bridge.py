#!/usr/bin/env python3
"""Check the React Native plugin's bridges against an Adivery SDK AAR and against each other.

The Kotlin module (android/src/main/java) calls the SDK's public API, so the Kotlin compiler
catches SDK renames/removals - but not a callback the SDK added to a listener class (it compiles
fine and the event is silently dropped). And the JS side (src/) reaches Kotlin only by name:
NativeModules method names, event-name strings and payload keys, the native view name and props.
None of that is compile-checked. This is.

  bridge.py api   <sdk.aar> <repo>                       SDK classes the Kotlin imports, with their API
  bridge.py check <sdk.aar> <repo> [--baseline <old.aar>]
      Kotlin vs AAR: imported classes exist; `override`s exist in the SDK class (else it won't
      compile); SDK listener callbacks not forwarded (with --baseline: only ones new since it).
      JS vs Kotlin: NativeModules calls vs @ReactMethods (name, arity, Promise last); events JS
      subscribes to vs events Kotlin emits, and payload keys; native view name and props.
      Exit 1 on errors. "NOT FORWARDED" items are reported for a human to decide, not errors.

Diff two `api` outputs to see what a new SDK version changed. Run with `python3 -I`; needs javap.
"""
import os
import re
import subprocess
import sys
import tempfile
import zipfile

SDK = "com.adivery.sdk."
# R8 gives internal classes/members one- or two-letter names that change between builds.
OBFUSCATED_NAME = re.compile(r"^[a-z]{1,2}$")
OBFUSCATED_TYPE = re.compile(r"\bcom\.adivery\.sdk\.(?:\w+\.)*[A-Za-z]{1,2}\b")


def real(m):
    """Not an R8/Kotlin artifact: no obfuscated name or type, no synthetic `access$`/`$default`."""
    return not OBFUSCATED_NAME.match(m[0]) and "$" not in m[0] and not any(OBFUSCATED_TYPE.search(p) for p in m[1])


# ---------- AAR side ----------

def javap_classes(jar, names):
    out = subprocess.run(["javap", "-public", "-cp", jar] + names, capture_output=True, text=True)
    return out.stdout


def load_sdk(aar, wanted):
    """{fqcn: {"super": fqcn|None, "kind": str, "methods": [(name, params, static, final, abstract)]}}
    for the wanted classes and their com.adivery.sdk superclasses."""
    api = {}
    with tempfile.TemporaryDirectory() as tmp:
        jar = os.path.join(tmp, "classes.jar")
        with zipfile.ZipFile(aar) as z, open(jar, "wb") as f:
            f.write(z.read("classes.jar"))
        with zipfile.ZipFile(jar) as j:
            present = {n[:-6].replace("/", ".") for n in j.namelist() if n.endswith(".class")}
        todo = [c for c in wanted]
        while todo:
            batch = [c for c in dict.fromkeys(todo) if c not in api]
            todo = []
            if not batch:
                break
            for c in batch:
                if c not in present:
                    api[c] = None  # missing from this AAR
            names = [c for c in batch if c in present]
            if not names:
                continue
            cur = None
            for line in javap_classes(jar, names).splitlines():
                line = line.strip()
                m = re.match(r"public (?:abstract |final )*(class|interface) ([\w.$]+)(?: extends ([\w.$]+))?", line)
                if m:
                    cur = api[m.group(2)] = {"kind": m.group(1), "super": m.group(3), "methods": []}
                    if m.group(3) and m.group(3).startswith(SDK) and m.group(3) not in api:
                        todo.append(m.group(3))
                    continue
                if cur is None or "(" not in line:
                    continue
                m = re.match(r"public ((?:[\w.$\[\]<>?,]+ )*?)([\w.$\[\]<>?,]+ )?([\w$]+)\((.*)\);$", line)
                if not m or m.group(2) is None:  # constructors ("public com.adivery.sdk.X(...)") don't match
                    continue
                mods, name = m.group(1).split(), m.group(3)
                params = tuple(p.strip() for p in re.split(r",(?![^<]*>)", m.group(4)) if p.strip())
                cur["methods"].append((name, params, "static" in mods, "final" in mods, "abstract" in mods))
    return api


def all_methods(api, fqcn):
    seen, out = set(), []
    while fqcn and fqcn.startswith(SDK) and api.get(fqcn):
        for m in api[fqcn]["methods"]:
            key = (m[0], m[1])
            if key not in seen:
                seen.add(key)
                out.append(m)
        fqcn = api[fqcn]["super"]
    return out


def callbacks(api, fqcn):
    """Methods a subclass can usefully override: public, non-static, non-final, real names/types."""
    return [m for m in all_methods(api, fqcn) if not m[2] and not m[3] and real(m)]


# ---------- source helpers ----------

def read_tree(root, exts, skip=("__tests__", "node_modules", "build")):
    files = {}
    for d, dirs, fs in os.walk(root):
        dirs[:] = [x for x in dirs if x not in skip]
        for f in fs:
            if f.endswith(exts):
                p = os.path.join(d, f)
                files[p] = open(p, encoding="utf-8").read()
    return files


def matching(src, start, open_ch, close_ch):
    """Index just past the bracket matching src[start] (which must be open_ch)."""
    depth = 0
    for i in range(start, len(src)):
        if src[i] == open_ch:
            depth += 1
        elif src[i] == close_ch:
            depth -= 1
            if depth == 0:
                return i + 1
    return len(src)


def split_args(text):
    depth, args, cur = 0, [], ""
    for ch in text:
        if ch in "([{<":
            depth += 1
        elif ch in ")]}>":
            depth -= 1
        if ch == "," and depth == 0:
            args.append(cur.strip())
            cur = ""
        else:
            cur += ch
    if cur.strip():
        args.append(cur.strip())
    return args


def call_args(src, paren_idx):
    end = matching(src, paren_idx, "(", ")")
    return split_args(src[paren_idx + 1:end - 1])


def lineno(src, pos):
    return src.count("\n", 0, pos) + 1


def kotlin_imports(kt_files):
    imports = {}
    for src in kt_files.values():
        for m in re.finditer(r"^import (com\.adivery\.sdk\.[\w.]+)$", src, re.M):
            imports[m.group(1).rsplit(".", 1)[1]] = m.group(1)
    return imports


# ---------- commands ----------

def cmd_api(aar, repo):
    kt = read_tree(os.path.join(repo, "android", "src", "main", "java"), (".kt", ".java"))
    imports = kotlin_imports(kt)
    api = load_sdk(aar, sorted(imports.values()))
    # One block per imported class with inherited SDK methods folded in, so a method moving to a
    # superclass between versions doesn't show up as a change.
    for fqcn in sorted(set(imports.values())):
        info = api.get(fqcn)
        if info is None:
            print("MISSING %s" % fqcn)
            continue
        print("%s %s" % (info["kind"], fqcn[len(SDK):]))
        for name, params, static, final, abstract in sorted(m for m in all_methods(api, fqcn) if real(m)):
            mods = " ".join(x for x, on in (("static", static), ("final", final), ("abstract", abstract)) if on)
            print("  %s%s(%s)" % (mods + " " if mods else "", name, ", ".join(params)))


def cmd_check(aar, repo, baseline=None):
    kt_dir = os.path.join(repo, "android", "src", "main", "java")
    kt = read_tree(kt_dir, (".kt",))
    js = read_tree(os.path.join(repo, "src"), (".ts", ".tsx", ".js", ".jsx"))
    imports = kotlin_imports(kt)
    api = load_sdk(aar, sorted(imports.values()))
    base = load_sdk(baseline, sorted(imports.values())) if baseline else None
    errors, warnings, unforwarded, checked = [], [], [], 0
    rel = lambda p: os.path.relpath(p, repo)

    # --- Kotlin vs AAR ---
    for short, fqcn in sorted(imports.items()):
        checked += 1
        if api.get(fqcn) is None:
            errors.append("import %s - not in the AAR" % fqcn)

    for path, src in sorted(kt.items()):
        for m in re.finditer(r"object\s*:\s*(\w+)\s*\(\s*\)\s*\{", src):
            cls = imports.get(m.group(1))
            if not cls or not api.get(cls):
                continue
            block = src[m.end() - 1:matching(src, m.end() - 1, "{", "}")]
            overrides = {}
            for o in re.finditer(r"override fun (\w+)\s*\(", block):
                overrides.setdefault(o.group(1), set()).add(len(call_args(block, o.end() - 1)))
            sdk_methods = all_methods(api, cls)
            for name, arities in sorted(overrides.items()):
                checked += 1
                have = {len(p) for n, p, *_ in sdk_methods if n == name}
                if not have:
                    errors.append("%s:%d: override %s.%s - no such method in the AAR (won't compile)" % (
                        rel(path), lineno(src, m.start()), m.group(1), name))
                elif not arities & have:
                    errors.append("%s:%d: override %s.%s%s - AAR has arity %s" % (
                        rel(path), lineno(src, m.start()), m.group(1), name, sorted(arities), sorted(have)))
            base_keys = {(n, p) for n, p, *_ in callbacks(base, cls)} if base and base.get(cls) else None
            missing = [(n, p) for n, p, *_ in callbacks(api, cls)
                       if len(p) not in overrides.get(n, set())]
            for n, p in missing:
                checked += 1
                if base_keys is None or (n, p) not in base_keys:
                    unforwarded.append("%s:%d: %s.%s(%s)%s" % (
                        rel(path), lineno(src, m.start()), m.group(1), n, ", ".join(p),
                        "  [new since baseline]" if base_keys is not None else ""))

        # Static calls on imported SDK classes, e.g. Adivery.prepareOfferWallAd(ctx, id).
        for c in re.finditer(r"\b([A-Z]\w+)\.(\w+)\s*\(", src):
            cls = imports.get(c.group(1))
            if not cls or not api.get(cls):
                continue
            name, nargs = c.group(2), len(call_args(src, c.end() - 1))
            statics = {len(p) for n, p, st, *_ in all_methods(api, cls) if n == name and st}
            checked += 1
            if not statics:
                errors.append("%s:%d: %s.%s - no such static method in the AAR" % (
                    rel(path), lineno(src, c.start()), c.group(1), name))
            elif nargs not in statics:
                errors.append("%s:%d: %s.%s called with %d args - AAR has %s" % (
                    rel(path), lineno(src, c.start()), c.group(1), name, nargs, sorted(statics)))

    # --- Kotlin native module(s): name -> {method: (params, line, path)} ---
    modules, view_managers = {}, {}
    for path, src in kt.items():
        name = re.search(r'getName\(\)[^{=\n]*(?:=\s*"([^"]+)"|\{\s*return\s+"([^"]+)")', src)
        if not name:
            continue
        name = name.group(1) or name.group(2)
        if re.search(r"ReactContextBaseJavaModule|BaseJavaModule", src):
            methods = {}
            for r in re.finditer(r"@ReactMethod(?:\([^)]*\))?\s+fun (\w+)\s*\(", src):
                params = call_args(src, r.end() - 1)
                types = [p.split(":", 1)[1].strip() if ":" in p else p for p in params]
                methods[r.group(1)] = (types, lineno(src, r.start()), path)
                checked += 1
                if "Promise" in types[:-1]:
                    errors.append("%s:%d: @ReactMethod %s - Promise must be the last parameter "
                                  "(new architecture throws ParsingException)" % (
                                      rel(path), lineno(src, r.start()), r.group(1)))
            modules[name] = methods
        if re.search(r"ViewGroupManager<|SimpleViewManager<", src):
            view_managers[name] = (set(re.findall(r'@ReactProp\(\s*name\s*=\s*"(\w+)"', src)), path)

    # --- JS -> Kotlin module calls ---
    called = {}
    for path, src in sorted(js.items()):
        aliases = set(re.findall(r"const\s*\{\s*([\w\s,]+)\}\s*=\s*NativeModules", src))
        names = {a.strip() for group in aliases for a in group.split(",") if a.strip()}
        pattern = r"\b(?:NativeModules\.)?(%s)\.(\w+)\s*\(" % "|".join(map(re.escape, names | set(modules))) \
            if (names | set(modules)) else None
        if not pattern:
            continue
        for c in re.finditer(pattern, src):
            mod, meth = c.group(1), c.group(2)
            if mod not in modules:
                errors.append("%s:%d: NativeModules.%s - no Kotlin module with getName() == \"%s\"" % (
                    rel(path), lineno(src, c.start()), mod, mod))
                continue
            checked += 1
            called.setdefault(mod, set()).add(meth)
            if meth not in modules[mod]:
                errors.append("%s:%d: %s.%s - no @ReactMethod fun %s in Kotlin" % (
                    rel(path), lineno(src, c.start()), mod, meth, meth))
                continue
            types = modules[mod][meth][0]
            expected = len(types) - (1 if types and types[-1] == "Promise" else 0)
            nargs = len(call_args(src, c.end() - 1))
            if nargs != expected:
                errors.append("%s:%d: %s.%s called with %d args - @ReactMethod takes %d%s" % (
                    rel(path), lineno(src, c.start()), mod, meth, nargs, expected,
                    " (plus the Promise)" if expected != len(types) else ""))
    for mod, methods in sorted(modules.items()):
        for meth, (_, line, path) in sorted(methods.items()):
            if meth not in called.get(mod, set()):
                warnings.append("%s:%d: @ReactMethod %s.%s isn't called from src/ (not exposed to JS users)" % (
                    rel(path), line, mod, meth))

    # --- Events: Kotlin emits vs JS subscribes, and payload keys ---
    kt_consts = {}
    for src in kt.values():
        kt_consts.update(re.findall(r'const val (\w+)\s*=\s*"([^"]+)"', src))
    emitted = {}  # event name -> set of payload keys
    for path, src in sorted(kt.items()):
        for s in re.finditer(r"sendEvent\s*\(", src):
            args = call_args(src, s.end() - 1)
            if len(args) < 3:
                continue
            ev = args[1]
            event = ev.strip('"') if ev.startswith('"') else kt_consts.get(ev)
            if event is None:
                continue  # the helper's own `eventName` parameter
            fn_start = src.rfind("fun ", 0, s.start())
            body = src[fn_start:s.start()]
            keys = set(re.findall(r"\b%s\.put\w+\(\s*\"(\w+)\"" % re.escape(args[2]), body))
            emitted.setdefault(event, set()).update(keys)

    subscribed = set()
    for path, src in sorted(js.items()):
        js_consts = dict(re.findall(r"\b([A-Z][A-Z0-9_]+)\s*=\s*['\"]([^'\"]+)['\"]", src))
        for a in re.finditer(r"\.addListener\s*\(", src):
            args = call_args(src, a.end() - 1)
            if len(args) < 2:
                continue
            ref = args[0].replace("this.", "")
            event = ref.strip("'\"") if ref[:1] in "'\"" else js_consts.get(ref)
            if event is None:
                warnings.append("%s:%d: addListener(%s, ...) - can't resolve the event name" % (
                    rel(path), lineno(src, a.start()), args[0]))
                continue
            checked += 1
            subscribed.add(event)
            if event not in emitted:
                errors.append("%s:%d: JS subscribes to \"%s\" but Kotlin never emits it" % (
                    rel(path), lineno(src, a.start()), event))
                continue
            handler = args[1]
            pm = re.match(r"\(?\s*(\w+)\s*(?::[^)=]*)?\)?\s*=>", handler)
            if pm:
                read = set(re.findall(r"\b%s\.(\w+)" % re.escape(pm.group(1)), handler))
                for key in sorted(read - emitted[event]):
                    errors.append("%s:%d: \"%s\" handler reads event.%s - Kotlin sends %s" % (
                        rel(path), lineno(src, a.start()), event, key, sorted(emitted[event])))
    for event in sorted(set(emitted) - subscribed):
        warnings.append("Kotlin emits \"%s\" but nothing in src/ subscribes to it" % event)

    # --- Native views: requireNativeComponent name and props ---
    for path, src in sorted(js.items()):
        js_consts = dict(re.findall(r"\b(\w+)\s*=\s*['\"]([^'\"]+)['\"]", src))
        for r in re.finditer(r"(?:const|let|var)\s+(\w+)\s*=\s*requireNativeComponent(?:<[^>]*>)?\s*\(\s*([^)]+)\)", src):
            var, arg = r.group(1), r.group(2).strip()
            view = arg.strip("'\"") if arg[:1] in "'\"" else js_consts.get(arg)
            checked += 1
            if view not in view_managers:
                errors.append("%s:%d: requireNativeComponent(\"%s\") - no ViewManager with that getName()" % (
                    rel(path), lineno(src, r.start()), view))
                continue
            props_kt, kt_path = view_managers[view]
            for jsx in re.finditer(r"<%s\b(.*?)/?>" % re.escape(var), src, re.S):
                passed = set(re.findall(r"\b(\w+)\s*=\s*\{", jsx.group(1))) - {"style", "key", "ref", "children"}
                for p in sorted(passed - props_kt):
                    errors.append("%s:%d: <%s %s=...> - no @ReactProp(name = \"%s\") in %s" % (
                        rel(path), lineno(src, jsx.start()), var, p, p, rel(kt_path)))
                for p in sorted(props_kt - passed):
                    warnings.append("%s:%d: @ReactProp \"%s\" is never passed by <%s>" % (
                        rel(path), lineno(src, jsx.start()), p, var))

    for w in warnings:
        print("WARN          " + w)
    for u in unforwarded:
        print("NOT FORWARDED " + u)
    for e in errors:
        print("ERROR         " + e)
    print("%d reference(s) checked: %d error(s), %d warning(s), %d not forwarded%s against %s" % (
        checked, len(errors), len(warnings), len(unforwarded),
        " (new since baseline)" if baseline else "", os.path.basename(aar)))
    return 1 if errors else 0


if __name__ == "__main__":
    a = sys.argv[1:]
    if len(a) == 3 and a[0] == "api":
        cmd_api(a[1], a[2])
    elif len(a) == 3 and a[0] == "check":
        sys.exit(cmd_check(a[1], a[2]))
    elif len(a) == 5 and a[0] == "check" and a[3] == "--baseline":
        sys.exit(cmd_check(a[1], a[2], a[4]))
    else:
        sys.exit(__doc__)
