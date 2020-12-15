declare module "split-sms";

declare function typeInto(
  selector: string,
  text: string,
  replace: boolean = false
);

declare function type(text: string);
declare function click(selector: string);
declare function pressKey(key, times: number = 1);
