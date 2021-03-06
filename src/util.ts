import { inputs } from "actions-inputs";
import { ConditionalKeys } from "type-fest";

type InputsWithStringType = ConditionalKeys<typeof inputs, string | undefined>;

export const getListFromInput = (inputName: InputsWithStringType): string[] => {
    // fix-it
    const inputValue = inputs[inputName]!;
    return inputValue
        .split("\n")
        .map(filePath => filePath.trim())
        // omit empty strings
        .filter(Boolean);
};