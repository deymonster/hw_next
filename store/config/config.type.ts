import type { TypeBaseColor } from "@/libs/constants/color.constants";

export interface ConfigStore {
    theme: TypeBaseColor,
    setTheme: (theme: TypeBaseColor) => void,
}