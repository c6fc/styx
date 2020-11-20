local backend(settings) = {
	terraform: {
		backend: {
			s3: {
				bucket: settings.backendBucket,
				key: "c6fc.io/styx/terraform.tfstate",
				profile: settings.awsProfile,

				region: settings.defaultRegion
			}
		},
	}
};

backend