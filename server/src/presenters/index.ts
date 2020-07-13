import { createDataLayoutPresenter, createPageableDataLayoutPresenter } from "./base";

import * as Mail from "./mail";
import * as Success from "./success";

export const Schemas = {
  ...Mail.Schemas,
  ...Success.Schemas,
};

export const MailShow = createDataLayoutPresenter(Mail.presenter);
export const MailPaginatedList = createPageableDataLayoutPresenter(Mail.arrayPresenter);

export const Succeed = createDataLayoutPresenter(Success.presenter);
