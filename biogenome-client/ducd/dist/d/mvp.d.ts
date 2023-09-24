interface U {
    all: () => void;
    parent: () => void;
}
interface M {
}
interface View<V, U = U, VParent = V> {
    parent: VParent;
    children: () => View<any, U>;
}
declare class C<M, V, VParent> {
    model: M;
    api: {};
    private view;
    private update;
    constructor(view: V, model: M);
}
