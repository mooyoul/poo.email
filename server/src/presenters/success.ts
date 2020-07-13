import { Static, Type } from '@sinclair/typebox';
import { Presenter } from "vingle-corgi";

const Success = Type.Object({
  success: Type.Boolean(),
});

type SuccessType = Static<typeof Success>;

export const Schemas = {
  Success,
};

export const presenter: Presenter<boolean, SuccessType> = {
  outputJSONSchema: () => ({
    items: { $ref: "#/components/schemas/Success" },
  }),
  present: async (input: boolean) => ({ success: input }),
};
