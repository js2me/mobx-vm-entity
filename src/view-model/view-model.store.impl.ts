import {
  action,
  computed,
  makeObservable,
  observable,
  runInAction,
} from 'mobx';

import { ViewModelsConfig } from '../config/index.js';
import { mergeVMConfigs } from '../config/utils/merge-vm-configs.js';
import {
  ComponentWithLazyViewModel,
  ComponentWithViewModel,
} from '../hoc/index.js';
import { generateVMId } from '../utils/index.js';
import { Class, Maybe } from '../utils/types.js';

import { ViewModelImpl } from './view-model.impl.js';
import { ViewModelStore } from './view-model.store.js';
import {
  ViewModelCreateConfig,
  ViewModelGenerateIdConfig,
  ViewModelLookup,
  ViewModelStoreConfig,
} from './view-model.store.types.js';
import { AnyViewModel } from './view-model.types.js';

export class ViewModelStoreImpl<VMBase extends AnyViewModel = AnyViewModel>
  implements ViewModelStore<VMBase>
{
  protected viewModels: Map<string, VMBase>;
  protected linkedComponentVMClasses: Map<
    ComponentWithViewModel<VMBase, any>,
    Class<VMBase>
  >;
  protected viewModelIdsByClasses: Map<Class<VMBase>, string[]>;
  protected instanceAttachedCount: Map<string, number>;

  /**
   * Views waiting for mount
   */
  protected mountingViews: Set<string>;

  /**
   * Views waiting for unmount
   */
  protected unmountingViews: Set<string>;

  protected vmConfig: ViewModelsConfig;

  constructor(protected config?: ViewModelStoreConfig) {
    this.viewModels = observable.map([], { deep: false });
    this.linkedComponentVMClasses = observable.map([], { deep: false });
    this.viewModelIdsByClasses = observable.map([], { deep: false });
    this.instanceAttachedCount = observable.map([], { deep: false });
    this.mountingViews = observable.set([], { deep: false });
    this.unmountingViews = observable.set([], { deep: false });
    this.vmConfig = mergeVMConfigs(config?.vmConfig);

    computed(this, 'mountedViewsCount');
    action(this, 'mount');
    action(this, 'unmount');
    action(this, 'attach');
    action(this, 'detach');
    action(this, 'linkComponent');

    makeObservable(this);
  }

  get mountedViewsCount() {
    return [...this.instanceAttachedCount.values()].reduce(
      (sum, count) => sum + count,
      0,
    );
  }

  processCreateConfig<VM extends VMBase>(
    config: ViewModelCreateConfig<VM>,
  ): void {
    this.linkComponents(
      config.VM,
      config.component,
      config.ctx?.externalComponent,
    );
  }

  createViewModel<VM extends VMBase>(config: ViewModelCreateConfig<VM>): VM {
    const ViewModelConstructor = config.VM as unknown as typeof ViewModelImpl;
    return new ViewModelConstructor({
      ...config,
      config: mergeVMConfigs(this.vmConfig, config.config),
    }) as unknown as VM;
  }

  generateViewModelId<VM extends VMBase>(
    config: ViewModelGenerateIdConfig<VM>,
  ): string {
    if (config.id) {
      return config.id;
    } else {
      return generateVMId(config.ctx);
    }
  }

  linkComponents(
    VM: Class<VMBase>,
    ...components: Maybe<
      | ComponentWithViewModel<VMBase, any>
      | ComponentWithLazyViewModel<VMBase, any>
    >[]
  ): void {
    components.forEach((component) => {
      if (component && !this.linkedComponentVMClasses.has(component)) {
        this.linkedComponentVMClasses.set(component, VM);
      }
    });
  }

  unlinkComponents(
    ...components: Maybe<
      | ComponentWithViewModel<VMBase, any>
      | ComponentWithLazyViewModel<VMBase, any>
    >[]
  ): void {
    components.forEach((component) => {
      if (component && this.linkedComponentVMClasses.has(component)) {
        this.linkedComponentVMClasses.delete(component);
      }
    });
  }

  getIds<T extends VMBase>(vmLookup: Maybe<ViewModelLookup<T>>): string[] {
    if (!vmLookup) return [];

    if (typeof vmLookup === 'string') {
      return [vmLookup];
    }

    const viewModelClass = (this.linkedComponentVMClasses.get(
      vmLookup as any,
    ) || vmLookup) as Class<T>;

    const viewModelIds = this.viewModelIdsByClasses.get(viewModelClass) || [];

    return viewModelIds;
  }

  getId<T extends VMBase>(vmLookup: Maybe<ViewModelLookup<T>>): string | null {
    const viewModelIds = this.getIds(vmLookup);

    if (viewModelIds.length === 0) return null;

    if (process.env.NODE_ENV !== 'production' && viewModelIds.length > 1) {
      console.warn(
        `Found more than 1 view model with the same identifier. Last instance will been returned`,
      );
    }

    return viewModelIds.at(-1)!;
  }

  has<T extends VMBase>(vmLookup: Maybe<ViewModelLookup<T>>): boolean {
    const id = this.getId(vmLookup);

    if (!id) return false;

    return this.viewModels.has(id);
  }

  get<T extends VMBase>(vmLookup: Maybe<ViewModelLookup<T>>): T | null {
    this.viewModels.keys();

    const id = this.getId(vmLookup);

    if (!id) return null;

    return (this.viewModels.get(id) as Maybe<T>) ?? null;
  }

  getAll<T extends VMBase>(vmLookup: Maybe<ViewModelLookup<T>>): T[] {
    const viewModelIds = this.getIds(vmLookup);

    return viewModelIds.map((id) => this.viewModels.get(id) as T);
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
    this.viewModels.clear();
    this.linkedComponentVMClasses.clear();
    this.viewModelIdsByClasses.clear();
    this.instanceAttachedCount.clear();
    this.mountingViews.clear();
    this.unmountingViews.clear();
  }
}
