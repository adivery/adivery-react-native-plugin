// The JS wrapper talks to Kotlin only through NativeModules.AdiveryModule and event-name strings,
// so these tests mock react-native and check that wiring: calls reach the native module, every
// event the wrapper defines is subscribed and reaches the matching addGlobalListener callback with
// its payload fields, and destroy() removes every subscription.

type Listener = (event: any) => void;

const mockListeners: Record<string, Listener[]> = {};
const mockRemove = jest.fn();
const mockModule = {
  configure: jest.fn(),
  setUserId: jest.fn(),
  prepareRewardedAd: jest.fn(),
  prepareInterstitialAd: jest.fn(),
  prepareAppOpenAd: jest.fn(),
  showAd: jest.fn(),
  showAppOpenAd: jest.fn(),
  isLoaded: jest.fn(() => Promise.resolve(true)),
  requestNativeAd: jest.fn(() => Promise.resolve({ id: 'ad-1' })),
  recordNativeAdImpression: jest.fn(),
  recordNativeAdClick: jest.fn(),
};

jest.mock('react-native', () => ({
  NativeModules: { AdiveryModule: mockModule },
  NativeEventEmitter: class {
    addListener(name: string, listener: Listener) {
      (mockListeners[name] = mockListeners[name] || []).push(listener);
      return { remove: mockRemove };
    }
  },
  requireNativeComponent: () => 'AdiveryBannerAdView',
  StyleSheet: { create: (styles: object) => styles },
  PixelRatio: { get: () => 2 },
  View: 'View',
}));

let Adivery: any;

const emit = (name: string, event: object) =>
  (mockListeners[name] || []).forEach((listener) => listener(event));

const eventNames = () =>
  Object.entries(Adivery)
    .filter(([key]) => key.endsWith('_EVENT_NAME'))
    .map(([, value]) => value as string);

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(mockListeners).forEach((name) => delete mockListeners[name]);
  // Adivery is a module-level singleton: load a fresh copy for every test.
  jest.isolateModules(() => {
    Adivery = require('../index').Adivery;
  });
  Adivery.configure('app-id');
});

it('configures the native SDK and subscribes to every event it defines', () => {
  expect(mockModule.configure).toHaveBeenCalledWith('app-id');
  expect(eventNames().length).toBeGreaterThan(0);
  expect(Object.keys(mockListeners).sort()).toEqual(eventNames().sort());
});

it.each([
  ['AdiveryRewardedLoaded', 'onRewardedAdLoaded', { placementId: 'p' }, ['p']],
  ['AdiveryRewardedShown', 'onRewardedAdShown', { placementId: 'p' }, ['p']],
  ['AdiveryRewardedClick', 'onRewardedAdClicked', { placementId: 'p' }, ['p']],
  [
    'AdiveryRewardedClosed',
    'onRewardedAdClosed',
    { placementId: 'p', isRewarded: true },
    ['p', true],
  ],
  [
    'AdiveryInterstitialLoaded',
    'onInterstitialAdLoaded',
    { placementId: 'p' },
    ['p'],
  ],
  [
    'AdiveryInterstitialShown',
    'onInterstitialAdShown',
    { placementId: 'p' },
    ['p'],
  ],
  [
    'AdiveryInterstitialClick',
    'onInterstitialAdClicked',
    { placementId: 'p' },
    ['p'],
  ],
  [
    'AdiveryInterstitialClosed',
    'onInterstitialAdClosed',
    { placementId: 'p' },
    ['p'],
  ],
  ['AdiveryAppOpenLoaded', 'onAppOpenAdLoaded', { placementId: 'p' }, ['p']],
  ['AdiveryAppOpenShown', 'onAppOpenAdShown', { placementId: 'p' }, ['p']],
  ['AdiveryAppOpenClick', 'onAppOpenAdClicked', { placementId: 'p' }, ['p']],
  ['AdiveryAppOpenClosed', 'onAppOpenAdClosed', { placementId: 'p' }, ['p']],
  ['AdiveryOnError', 'onError', { placementId: 'p', message: 'm' }, ['p', 'm']],
])('forwards %s to %s', (eventName, callbackName, event, expected) => {
  const callback = jest.fn();
  Adivery.addGlobalListener({ [callbackName]: callback });
  emit(eventName, event);
  expect(callback).toHaveBeenCalledWith(...expected);
});

it('covers every event the wrapper defines', () => {
  // Keep the table above in step with the wrapper: a new event needs a forwarding test.
  expect(eventNames().length).toBe(13);
});

it('forwards calls to the native module', async () => {
  Adivery.setUserId('user');
  Adivery.prepareRewardedAd('r');
  Adivery.prepareInterstitialAd('i');
  Adivery.prepareAppOpenAd('o');
  Adivery.showAd('i');
  Adivery.showAppOpenAd('o');
  expect(mockModule.setUserId).toHaveBeenCalledWith('user');
  expect(mockModule.prepareRewardedAd).toHaveBeenCalledWith('r');
  expect(mockModule.prepareInterstitialAd).toHaveBeenCalledWith('i');
  expect(mockModule.prepareAppOpenAd).toHaveBeenCalledWith('o');
  expect(mockModule.showAd).toHaveBeenCalledWith('i');
  expect(mockModule.showAppOpenAd).toHaveBeenCalledWith('o');

  await expect(Adivery.isLoaded('i')).resolves.toBe(true);
  expect(mockModule.isLoaded).toHaveBeenCalledWith('i');

  const ad = await Adivery.requestNativeAd('n');
  expect(mockModule.requestNativeAd).toHaveBeenCalledWith('n');
  Adivery.recordNativeAdImpression(ad);
  Adivery.recordNativeAdClick(ad);
  expect(mockModule.recordNativeAdImpression).toHaveBeenCalledWith('ad-1');
  expect(mockModule.recordNativeAdClick).toHaveBeenCalledWith('ad-1');
});

it('removes every subscription on destroy', () => {
  Adivery.destroy();
  expect(mockRemove).toHaveBeenCalledTimes(eventNames().length);
});
