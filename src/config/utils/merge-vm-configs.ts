import { Maybe } from 'yummies/utils/types';

import { viewModelsConfig } from '../global-config';
import { ViewModelsConfig, ViewModelsRawConfig } from '../types';

export const mergeVMConfigs = (...configs: Maybe<ViewModelsRawConfig>[]) => {
  const result = { ...viewModelsConfig };

  configs.forEach((config) => {
    if (!config) {
      return;
    }

    const { startViewTransitions } = config;

    if (startViewTransitions) {
      const startViewTransitonsUpdate: Partial<
        ViewModelsConfig['startViewTransitions']
      > =
        typeof startViewTransitions === 'boolean'
          ? ({
              mount: startViewTransitions,
              payloadChange: startViewTransitions,
              unmount: startViewTransitions,
            } satisfies ViewModelsConfig['startViewTransitions'])
          : startViewTransitions;

      Object.assign(result.startViewTransitions, startViewTransitonsUpdate);
    }
  });

  return result;
};