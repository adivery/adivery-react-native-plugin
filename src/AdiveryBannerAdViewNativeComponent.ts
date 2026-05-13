import type {ViewProps} from 'react-native';
import type {HostComponent} from 'react-native';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';
import type {Int32} from 'react-native/Libraries/Types/CodegenTypes';

interface NativeProps extends ViewProps {
  placementId: string;
  bannerSize: Int32;
}

export default codegenNativeComponent<NativeProps>(
  'AdiveryBannerAdView'
) as HostComponent<NativeProps>;
