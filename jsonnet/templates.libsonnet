{
	"data": {
		"template_file": {
			"cognito_config": {
				"template": "${file(\"${path.module}/templates/cognito_config.tpl\")}",

				"vars": {
					"aws_region": "us-west-2",
					"client_id": "${aws_cognito_user_pool_client.styx.id}",
					"user_pool_id": "${aws_cognito_user_pool.styx.id}",
					"identity_pool_id": "${aws_cognito_identity_pool.styx.id}",
					"apigw": "${aws_api_gateway_domain_name.styx.domain_name}",
					"awsid": "${data.aws_caller_identity.current.account_id}"
				}
			}
		}
	},
	"resource": {
		"local_file": {
			"cognito_config": {
				"content": "${data.template_file.cognito_config.rendered}",
				"filename": "${path.module}/site_content/angular/cognito_config.js",
			}
		}
	}
}