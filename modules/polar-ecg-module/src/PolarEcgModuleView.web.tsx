import * as React from 'react';

import { PolarEcgModuleViewProps } from './PolarEcgModule.types';

export default function PolarEcgModuleView(props: PolarEcgModuleViewProps) {
  return (
    <div>
      <iframe
        style={{ flex: 1 }}
        src={props.url}
        onLoad={() => props.onLoad({ nativeEvent: { url: props.url } })}
      />
    </div>
  );
}
