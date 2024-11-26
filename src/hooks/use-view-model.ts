import { useContext } from 'react';

import { ActiveViewContext, ViewModelsContext } from '../contexts';
import { Class, Maybe } from '../utils/types';
import { AnyViewModel } from '../view-model';

export const useViewModel = <T extends AnyViewModel>(
  idOrClass?: Maybe<string> | Class<T>,
): T => {
  const viewModels = useContext(ViewModelsContext);
  const activeViewId = useContext(ActiveViewContext);
  const model = viewModels.get<T>(idOrClass ?? activeViewId);

  if (!model) {
    throw new Error('No model for view');
  }

  return model;
};
