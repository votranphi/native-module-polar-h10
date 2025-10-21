import { requireNativeView } from 'expo';
import * as React from 'react';

import { PolarEcgModuleViewProps } from './PolarEcgModule.types';

const NativeView: React.ComponentType<PolarEcgModuleViewProps> =
  requireNativeView('PolarEcgModule');

export default function PolarEcgModuleView(props: PolarEcgModuleViewProps) {
  return <NativeView {...props} />;
}
