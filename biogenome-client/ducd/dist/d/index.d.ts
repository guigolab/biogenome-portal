export * from './html';
export * from './visitor';
export * from './util';
export declare var t: (m: any) => any;
export interface Args {
    parent: any;
}
export interface Controller<Targs extends Args, Tui extends HTMLElement> {
    args: Targs;
    ui: Tui;
}
export interface UiArgs {
    parent: any;
}
export interface Ui<Targs> {
    args: Targs;
    ui: any;
}
