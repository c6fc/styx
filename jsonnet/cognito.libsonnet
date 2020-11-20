{
	resource(settings, certificate_arn): {
		"aws_cognito_user_pool": {
			"styx": {
				"name": "styx",
				"mfa_configuration": "${var.cognito_user_mfa}",
				"password_policy": {
					"minimum_length": 12,
					"require_lowercase": true,
					"require_uppercase": true,
					"require_symbols": false,
					"require_numbers": true,
					"temporary_password_validity_days": 3,
				},
				"admin_create_user_config": {
					"allow_admin_create_user_only": true,
					"invite_message_template": {
						"email_subject": "Styx",
						"email_message": "An account has been created for you in Styx (" + settings.root_fqdn + "). Use {username} and {####} to log in.",
						"sms_message": "Styx user created at " + settings.root_fqdn + ". Use {username} and {####} to log in."
					}
				},
				"auto_verified_attributes": ["email"],
				"username_attributes": ["email"]
			}
		},
		"aws_cognito_user_pool_client": {
			"styx": {
				"name": "styx_client",
				"user_pool_id": "${aws_cognito_user_pool.styx.id}",
				"generate_secret": false
			}
		},
		"aws_cognito_identity_pool": {
			"styx": {
				"identity_pool_name": "styx Identity Pool",
				"allow_unauthenticated_identities": false,
				"cognito_identity_providers": {
					"client_id": "${aws_cognito_user_pool_client.styx.id}",
					"provider_name": "${aws_cognito_user_pool.styx.endpoint}",
					"server_side_token_check": true,
				}
			}
		},
		"aws_cognito_user_pool_domain": {
			"styx": {
				"domain": "cognito." + settings.root_fqdn,
				"certificate_arn": certificate_arn,
				"user_pool_id": "${aws_cognito_user_pool.styx.id}",
				"depends_on": [
					"aws_route53_record.www-record"
				] + if std.length(settings.wildcard_acm_cert_arn) == 0 then [
					"aws_acm_certificate.main"
				] else []
			}
		},
		"aws_cognito_user_group": {
			"styx-admins": {
				"name": "styx-admins",
				"user_pool_id": "${aws_cognito_user_pool.styx.id}",
				"description": "Administrators of Styx",
				"precedence": "0",
				"role_arn": "${aws_iam_role.cognito_admins.arn}"
			}
		}
	}
}