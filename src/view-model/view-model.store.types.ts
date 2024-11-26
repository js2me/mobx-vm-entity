import { ComponentType } from 'react';

import { AnyObject, Class, Maybe } from '../utils/types';

import { ViewModel } from './view-model';
import { AnyViewModel } from './view-model.types';

export interface ViewModelGenerateIdConfig<VM extends AnyViewModel> {
  VM: Class<VM>;
  id: Maybe<string>;
  ctx: AnyObject;
  parentViewModelId: string | null;
  fallback?: ComponentType;
  instances: Map<string, ViewModel>;
}

export interface ViewModelCreateConfig<VM extends AnyViewModel> {
  VM: Class<VM>;
  payload: VM['payload'];
  id: string;
  parentViewModelId: string | null;
  fallback?: ComponentType;
  instances: Map<string, ViewModel>;
  ctx?: AnyObject;
}
