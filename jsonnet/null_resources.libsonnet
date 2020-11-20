{
	resource(settings): {
		"resource": {
			"null_resource": {
				"s3-sync-static-content": {
					"provisioner": [{
						"local-exec": {
							"command": "aws --profile " + settings.awsProfile + " s3 --region " + settings.defaultRegion + " sync ${path.module}/site_content/ s3://${aws_s3_bucket.static_site.id}"
						}
					}],

					"depends_on": ["aws_s3_bucket.static_site", "local_file.cognito_config"],
					"triggers": {
						"content-changes": "${data.archive_file.s3_content.output_base64sha256}",
					}
				},
				"cognito-user": {
					"provisioner": [{
						"local-exec": {
							"command": "aws --region " + settings.defaultRegion + " --profile " + settings.awsProfile + " cognito-idp admin-create-user --user-pool-id ${aws_cognito_user_pool.styx.id} --username ${random_string.admin_password.keepers.admin_email} --user-attributes '[{\"Name\": \"email\", \"Value\": \"${random_string.admin_password.keepers.admin_email}\"}, {\"Name\": \"email_verified\", \"Value\": \"true\"}, {\"Name\": \"nickname\", \"Value\": \"" + settings.adminIamName + "\"}]' --temporary-password ${random_string.admin_password.result}"
						}
					}],

					"triggers": {
						"admin-email": settings.adminEmail,
					}
				},
				"cognito-group": {
					"provisioner": [{
						"local-exec": {
							"command": "aws --region " + settings.defaultRegion + " --profile " + settings.awsProfile + " cognito-idp admin-add-user-to-group --user-pool-id ${aws_cognito_user_pool.styx.id} --username ${random_string.admin_password.keepers.admin_email} --group-name styx-admins"
						}
					}],

					"depends_on": ["null_resource.cognito-user"],
					"triggers": {
						"admin-email": settings.adminEmail,
					}
				}
			}
		}
	}
}
