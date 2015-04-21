export = new ApiVersions();

import ApiBase = require("./ApiBase");
import ApiV0 = require("./ApiV0");

class ApiVersions {
	[version: string]: ApiBase;

	v0 = new ApiV0();
}
