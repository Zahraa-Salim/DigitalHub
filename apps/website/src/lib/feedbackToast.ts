import { Slide, toast, type ToastOptions } from "react-toastify";

type FeedbackOptions = Omit<ToastOptions, "toastId"> & {
  id?: string | number;
};

const DEFAULT_OPTIONS: ToastOptions = {
  position: "top-right",
  autoClose: 4600,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: false,
  transition: Slide,
  className: "dh-toast",
  bodyClassName: "dh-toast__body",
  progressClassName: "dh-toast__progress",
};

const withDefaults = (options?: FeedbackOptions): ToastOptions => {
  if (!options) {
    return { ...DEFAULT_OPTIONS };
  }

  const { id, ...rest } = options;
  return {
    ...DEFAULT_OPTIONS,
    ...rest,
    toastId: id,
  };
};

export const notifySuccess = (message: string, options?: FeedbackOptions) =>
  toast.success(message, withDefaults(options));

export const notifyError = (message: string, options?: FeedbackOptions) =>
  toast.error(message, withDefaults(options));

export const notifyInfo = (message: string, options?: FeedbackOptions) =>
  toast.info(message, withDefaults(options));

export const notifyWarning = (message: string, options?: FeedbackOptions) =>
  toast.warn(message, withDefaults(options));
