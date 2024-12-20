import {
  action,
  computed,
  makeObservable,
  observable,
  runInAction,
} from 'mobx';

import { ComponentWithViewModel } from '../hoc';
import { generateVMId } from '../utils';
import { Class, Maybe } from '../utils/types';

import { ViewModelStore } from './view-model.store';
import {
  ViewModelCreateConfig,
  ViewModelGenerateIdConfig,
  ViewModelLookup,
} from './view-model.store.types';
import { AnyViewModel } from './view-model.types';

export abstract class AbstractViewModelStore<
  VMBase extends AnyViewModel = AnyViewModel,
> implements ViewModelStore<VMBase>
{
  protected viewModels = observable.map<string, VMBase>();
  protected linkedComponentVMClasses = new Map<
    ComponentWithViewModel<VMBase, any>,
    Class<VMBase>
  >();
  protected viewModelIdsByClasses = observable.map<Class<VMBase>, string[]>();

  protected instanceAttachedCount = new Map<string, number>();

  /**
   * Views waiting for mount
   */
  protected mountingViews = observable.set<string>();

  /**
   * Views waiting for unmount
   */
  protected unmountingViews = observable.set<string>();

  constructor() {
    computed(this, 'mountedViewsCount');
    action(this, 'mount');
    action(this, 'unmount');
    action(this, 'attach');
    action(this, 'detach');

    makeObservable(this);
  }

  get mountedViewsCount() {
    return [...this.instanceAttachedCount.values()].reduce(
      (sum, count) => sum + count,
      0,
    );
  }

  abstract createViewModel<VM extends VMBase>(
    config: ViewModelCreateConfig<VM>,
  ): VM;

  generateViewModelId<VM extends VMBase>(
    config: ViewModelGenerateIdConfig<VM>,
  ): string {
    if (config.id) {
      return config.id;
    } else {
      return generateVMId(config.ctx);
    }
  }

  linkComponent(
    component: ComponentWithViewModel<VMBase, any>,
    VM: Class<VMBase>,
  ): void {
    if (!this.linkedComponentVMClasses.has(component)) {
      this.linkedComponentVMClasses.set(component, VM);
    }
  }

  getId<T extends VMBase>(
    lookupPayload: Maybe<ViewModelLookup<T>>,
  ): string | null {
    if (!lookupPayload) return null;

    if (typeof lookupPayload === 'string') {
      return lookupPayload;
    }

    const viewModelClass = (this.linkedComponentVMClasses.get(
      lookupPayload as any,
    ) || lookupPayload) as Class<T>;

    const viewModelIds = this.viewModelIdsByClasses.get(viewModelClass) || [];

    if (process.env.NODE_ENV !== 'production' && viewModelIds.length > 1) {
      console.warn(
        `Found more than 1 view model with the same identifier "${lookupPayload.name}". Last instance will been returned`,
      );
    }

    return viewModelIds.at(-1)!;
  }

  has<T extends VMBase>(idOrClass: Maybe<ViewModelLookup<T>>): boolean {
    const id = this.getId(idOrClass);

    if (!id) return false;

    return this.viewModels.has(id);
  }

  get<T extends VMBase>(idOrClass: Maybe<ViewModelLookup<T>>): T | null {
    const id = this.getId(idOrClass);

    if (!id) return null;

    return (this.viewModels.get(id) as Maybe<T>) ?? null;
  }

  async mount(model: VMBase) {
    this.mountingViews.add(model.id);

    await model.mount();

    runInAction(() => {
      this.mountingViews.delete(model.id);
    });
  }

  async unmount(model: VMBase) {
    this.unmountingViews.add(model.id);

    await model.unmount();

    runInAction(() => {
      this.unmountingViews.delete(model.id);
    });
  }

  async attach(model: VMBase) {
    const attachedCount = this.instanceAttachedCount.get(model.id) ?? 0;

    this.instanceAttachedCount.set(model.id, attachedCount + 1);

    if (this.viewModels.has(model.id)) {
      return;
    }

    this.viewModels.set(model.id, model);
    const constructor = (model as any).constructor as Class<any, any>;

    if (this.viewModelIdsByClasses.has(constructor)) {
      this.viewModelIdsByClasses.get(constructor)!.push(model.id);
    } else {
      this.viewModelIdsByClasses.set(constructor, [model.id]);
    }

    await this.mount(model);
  }

  async detach(id: string) {
    const attachedCount = this.instanceAttachedCount.get(id) ?? 0;

    const model = this.viewModels.get(id);

    if (model) {
      this.instanceAttachedCount.set(model.id, attachedCount - 1);

      if (attachedCount - 1 <= 0) {
        this.instanceAttachedCount.delete(model.id);

        const constructor = (model as any).constructor as Class<any, any>;

        await runInAction(async () => {
          this.viewModels.delete(id);

          if (this.viewModelIdsByClasses.has(constructor)) {
            this.viewModelIdsByClasses.set(
              constructor,
              this.viewModelIdsByClasses
                .get(constructor)!
                .filter((id) => id !== model.id),
            );
          }

          await this.unmount(model);
        });
      }
    }
  }

  isAbleToRenderView(id: Maybe<string>): boolean {
    return !!id && this.viewModels.has(id) && !this.mountingViews.has(id);
  }

  clean(): void {
    this.dispose();
  }

  dispose(): void {
    this.viewModels.clear();
    this.linkedComponentVMClasses.clear();
    this.viewModelIdsByClasses.clear();
    this.instanceAttachedCount.clear();
    this.mountingViews.clear();
    this.unmountingViews.clear();
  }
}
