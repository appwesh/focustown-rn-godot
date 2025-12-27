declare module '@borndotcom/react-native-godot' {
  import { ComponentType } from 'react';
  import { ViewProps } from 'react-native';

  export interface GodotModuleInterface {
    createInstance(args: string[]): unknown;
    getInstance(): unknown | null;
    API(): GodotAPI;
    updateWindow(windowName: string): unknown;
    pause(): void;
    resume(): void;
    is_paused(): boolean;
    runOnGodotThread<T>(f: () => T): Promise<T>;
    destroyInstance(): void;
    crash(): void;
  }

  export interface GodotAPI {
    Engine: GodotEngine;
    Vector2(): GodotVector2;
    Vector3(): GodotVector3;
    [key: string]: unknown;
  }

  export interface GodotEngine {
    get_main_loop(): GodotSceneTree;
  }

  export interface GodotSceneTree {
    get_root(): GodotNode;
  }

  export interface GodotNode {
    get_node_or_null(path: string): GodotNode | null;
    find_child(name: string, recursive: boolean, owned: boolean): GodotNode | null;
    [key: string]: unknown;
  }

  export interface GodotVector2 {
    x: number;
    y: number;
  }

  export interface GodotVector3 {
    x: number;
    y: number;
    z: number;
  }

  export const RTNGodot: GodotModuleInterface;

  export function runOnGodotThread<T>(f: () => T): Promise<T>;

  export interface RTNGodotViewProps extends ViewProps {
    windowName?: string;
  }

  export const RTNGodotView: ComponentType<RTNGodotViewProps>;
}

