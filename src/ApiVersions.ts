export default new ApiVersions();

import { ApiBase } from "ApiBase";
import { ApiV0 } from "ApiV0";

class ApiVersions {
	[version: string]: ApiBase;

	v0 = new ApiV0();
}
