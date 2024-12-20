import { ComponentWithViewModel } from '../hoc';
import { Cleanable } from '../utils/cleanable';
import { Class, Maybe } from '../utils/types';

import {
  ViewModelCreateConfig,
  ViewModelGenerateIdConfig,
  ViewModelLookup,
} from './view-model.store.types';
import { AnyViewModel } from './view-model.types';

/**
 * Interface representing a store for managing view models.
 * It extends the Disposable interface, allowing for cleanup of resources.
 */
export interface ViewModelStore<VMBase extends AnyViewModel = AnyViewModel>
  extends Cleanable {
  /**
   * Retrieves the ID of a view model based on a given ID or class type.
   * @param lookupPayload - The ID or class type of the view model.
   * @returns The ID of the view model, or null if not found.
   */
  getId<T extends VMBase>(
    lookupPayload: Maybe<ViewModelLookup<T>>,
  ): string | null;

  /**
   * The total number of views that are currently mounted.
   */
  mountedViewsCount: number;

  /**
   * Checks whether a view model instance exists in the store.
   * @param lookupPayload - The ID or class type of the view model.
   * @returns True if the instance exists, false otherwise.
   */
  has<T extends VMBase>(lookupPayload: Maybe<ViewModelLookup<T>>): boolean;

  /**
   * Retrieves a view model instance from the store.
   * @param lookupPayload - The ID or class type of the view model.
   * @returns The view model instance, or null if not found.
   */
  get<T extends VMBase>(lookupPayload: Maybe<ViewModelLookup<T>>): T | null;

  /**
   * Attaches a view model to the store.
   * @param model - The view model to attach.
   * @returns A promise that resolves when the operation is complete.
   */
  attach(model: VMBase): Promise<void>;

  /**
   * Detaches a view model from the store using its ID.
   * @param id - The ID of the view model to detach.
   * @returns A promise that resolves when the operation is complete.
   */
  detach(id: VMBase['id']): Promise<void>;

  /**
   * Determines if a view model is able to render based on its ID.
   * @param id - The ID of the view model.
   * @returns True if the view model can render, false otherwise.
   */
  isAbleToRenderView(id: Maybe<VMBase['id']>): boolean;

  /**
   * Creates a new view model instance based on the provided configuration.
   * @param config - The configuration for creating the view model.
   * @returns The newly created view model instance.
   */
  createViewModel<VM extends VMBase>(config: ViewModelCreateConfig<VM>): VM;

  /**
   * Links a React component with view model class.
   * @param component - The component to link.
   * @param VM - The view model class to link to.
   */
  linkComponent(
    component: ComponentWithViewModel<VMBase, any>,
    VM: Class<VMBase>,
  ): void;

  /**
   * Generates a unique ID for a view model based on the provided configuration.
   * @param config - The configuration for generating the ID.
   * @returns The generated unique ID.
   */
  generateViewModelId<VM extends VMBase>(
    config: ViewModelGenerateIdConfig<VM>,
  ): string;

  /**
   * @deprecated Please use {clean()} method
   */
  dispose(): void;
}
