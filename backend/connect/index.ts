const logEventAndContext = (event: any, context: any) => {
  console.log("invoked!");
  console.log("event:");
  console.log(event);
  console.log("context:");
  console.log(context);
};

exports.connect = (event: any, context: any) => {
  console.log("connected");
  logEventAndContext(event, context);
};

exports.disconnect = (event: any, context: any) => {
  console.log("disconnected");
  logEventAndContext(event, context);
};

exports.default = (event: any, context: any) => {
  console.log("defaulted");
  logEventAndContext(event, context);
};
