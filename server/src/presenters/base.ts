import { Static, Type } from "@sinclair/typebox";
import { Presenter } from "vingle-corgi";

export function createDataLayoutPresenter<Input, Output>(
  presenter: Presenter<Input, Output>,
): Presenter<Input, { data: Output }> {
  return {
    outputJSONSchema: () => ({
      type: "object",
      properties: {
        data: presenter.outputJSONSchema(),
      },
    }),
    present: async (input: Input) => {
      const data = await presenter.present(input);

      return {
        data,
      };
    },
  };
}

const PaginationSchema = Type.Object({
  before: Type.Optional(Type.String()),
  after: Type.Optional(Type.String()),
});
type Pagination = Static<typeof PaginationSchema>;

type PageableDataLayoutPresenterData<T> = {
  data: T;
  paging: Pagination;
};

export function createPageableDataLayoutPresenter<Input, Output>(
  presenter: Presenter<Input, Output>,
): Presenter<PageableDataLayoutPresenterData<Input>, PageableDataLayoutPresenterData<Output>> {
  return {
    outputJSONSchema: () => ({
      type: "object",
      properties: {
        data: presenter.outputJSONSchema(),
        paging: PaginationSchema,
      },
    }),
    present: async (input: PageableDataLayoutPresenterData<Input>) => {
      const data = await presenter.present(input.data);

      return {
        data,
        paging: input.paging,
      };
    },
  };
}
