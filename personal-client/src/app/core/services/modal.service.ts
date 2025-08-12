import { ApplicationRef, ComponentRef, createComponent, EnvironmentInjector, Injectable, TemplateRef, Type, ViewContainerRef } from '@angular/core';
import { environment } from 'src/environments/environments';
import { Options } from '../models/modal-options';
import { ModalComponent } from 'src/app/shared/components/modal/modal.component';

@Injectable({
  providedIn: 'root',
})
export class ModalService {
  // Create a reference to our modal component
  newModalComponent!: ComponentRef<ModalComponent>;
  // Optional content passed at the creation : animation, size, ...
  options!: Options | undefined;

  constructor(
    private appRef: ApplicationRef,
    private injector: EnvironmentInjector
  ) {}

  open<C>(
    vcrOrComponent: ViewContainerRef | Type<C>,
    param2?: TemplateRef<Element> | Options,
    options?: Options
  ): ComponentRef<C> | null {
    if (vcrOrComponent instanceof ViewContainerRef) {
      // For the first approach, we know that the second param will be of type TemplateRef, so we have to cast it
      this.openWithTemplate(vcrOrComponent, param2 as TemplateRef<Element>);
      this.options = options;
      return null;
    } else {
      // Same story here : for the second approach, the second param will be of type Options or undefined, since optional
      this.options = param2 as Options | undefined;
      return this.openWithComponent(vcrOrComponent); // Ensure that the return type is ComponentRef<C>
    }
  }


  private openWithTemplate(vcr: ViewContainerRef, content: TemplateRef<Element>) {
    // We first start to clear previous views
    vcr.clear();
    // We create a view with the template content
    const innerContent = vcr.createEmbeddedView(content);

    // We create the modal component, and project the template content in the ng-content of the modal component
    this.newModalComponent = vcr.createComponent(ModalComponent, {
      environmentInjector: this.injector,
      projectableNodes: [innerContent.rootNodes],
    });
  }

  private openWithComponent<C>(component: Type<C>): ComponentRef<C> {
    // Create the desired component
    const newComponent = createComponent(component, {
      environmentInjector: this.injector,
    });

    // Create the modal component and project the instance of the desired component in the ng-content
    this.newModalComponent = createComponent(ModalComponent, {
      environmentInjector: this.injector,
      projectableNodes: [[newComponent.location.nativeElement]],
    });

    document.body.appendChild(this.newModalComponent.location.nativeElement);

    // Attach views to the change detection cycle
    this.appRef.attachView(newComponent.hostView);
    this.appRef.attachView(this.newModalComponent.hostView);

    return newComponent; // Return ComponentRef<C>
  }

  close() {
    this.newModalComponent.instance.close();
  }
}
