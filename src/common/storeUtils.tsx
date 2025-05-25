import { StoreApi, UseBoundStore } from "zustand";

type UseStore<StoreType> = UseBoundStore<StoreApi<StoreType>>


// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFunction = (...args: any[]) => any

export type State<T> = T extends AnyFunction ? ReturnType<T> : T
type Setter<T> = Partial<T> | ((state: T) => void)

export type SetState<T> = (
  partial: Setter<State<T>>,
  replace?: false,
) => void

export type GetState<T> = () => State<T>

export type Store<T> = {
  setState: SetState<T>
  getState: () => State<T>
  subscribe: (listener: (state: State<T>, prevState: State<T>) => void) => () => void
}

export type StoreArgs<T> = [SetState<T>, () => State<T>, UseStore<T>]
