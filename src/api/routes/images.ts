import _ from "lodash";

import Request from "@/lib/request/Request.ts";
import { generateImages } from "@/api/controllers/images.ts";
import { tokenSplit } from "@/api/controllers/core.ts";
import util from "@/lib/util.ts";

export default {
  prefix: "/v1/images",

  post: {
    "/generations": async (request: Request) => {
      request
        .validate("body.model", (v) => _.isUndefined(v) || _.isString(v))
        .validate("body.prompt", _.isString)
        .validate(
          "body.negative_prompt",
          (v) => _.isUndefined(v) || _.isString(v)
        )
        .validate("body.width", (v) => _.isUndefined(v) || _.isFinite(v))
        .validate("body.height", (v) => _.isUndefined(v) || _.isFinite(v))
        .validate(
          "body.sample_strength",
          (v) => _.isUndefined(v) || _.isFinite(v)
        )
        .validate(
          "body.response_format",
          (v) => _.isUndefined(v) || _.isString(v)
        )
        // 新增：校验 resolution_type 参数，允许为 undefined 或 string
        .validate(
          "body.resolution_type",
          (v) => _.isUndefined(v) || _.isString(v)
        )
        .validate("headers.authorization", _.isString);
      // refresh_token切分
      const tokens = tokenSplit(request.headers.authorization);
      // 随机挑选一个refresh_token
      const token = _.sample(tokens);
      const {
        model,
        prompt,
        negative_prompt: negativePrompt,
        width,
        height,
        sample_strength: sampleStrength,
        response_format,
        // 新增：从请求体中提取 resolution_type
        resolution_type,
      } = request.body;
      const responseFormat = _.defaultTo(response_format, "url");
      const imageUrls = await generateImages(
        model,
        prompt,
        {
          width,
          height,
          sampleStrength,
          negativePrompt,
          // 新增：将 resolution_type 传递给 generateImages 函数
          resolutionType: resolution_type,
        },
        token
      );
      let data = [];
      if (responseFormat == "b64_json") {
        data = (
          await Promise.all(imageUrls.map((url) => util.fetchFileBASE64(url)))
        ).map((b64) => ({ b64_json: b64 }));
      } else {
        data = imageUrls.map((url) => ({
          url,
        }));
      }
      return {
        created: util.unixTimestamp(),
        data,
      };
    },
  },
};
