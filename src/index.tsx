import {
  requireNativeComponent,
  UIManager,
  Platform,
  ViewStyle,
} from 'react-native';

const LINKING_ERROR =
  `The package 'adivery' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo managed workflow\n';

type AdiveryProps = {
  color: string;
  style: ViewStyle;
};

const ComponentName = 'AdiveryView';

export const AdiveryView =
  UIManager.getViewManagerConfig(ComponentName) != null
    ? requireNativeComponent<AdiveryProps>(ComponentName)
    : () => {
        throw new Error(LINKING_ERROR);
      };
