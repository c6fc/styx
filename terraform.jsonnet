local settings = import 'settings.json';
local backend = import 'jsonnet/backend.libsonnet';
local iam = import 'jsonnet/iam.libsonnet';
local dynamodb = import 'jsonnet/dynamodb.libsonnet';
local route53 = import 'jsonnet/route53.libsonnet';
local s3 = import 'jsonnet/s3.libsonnet';
local acm = import 'jsonnet/acm.libsonnet';
local api_gateway = import 'jsonnet/api_gateway_map.libsonnet';
local cloudfront = import 'jsonnet/cloudfront.libsonnet';
local cognito = import 'jsonnet/cognito.libsonnet';
local cognito_iam_roles = import 'jsonnet/cognito_iam_roles.libsonnet';
local lambda = import 'jsonnet/lambda.libsonnet';
local null_resources = import 'jsonnet/null_resources.libsonnet';
local templates = import 'jsonnet/templates.libsonnet';

local certificate_arn = if std.length(settings.wildcard_acm_cert_arn) > 0 then
	settings.wildcard_acm_cert_arn
else "${aws_acm_certificate.main.arn}";

{
	'acm-wild.tf.json': if std.length(settings.wildcard_acm_cert_arn) == 0 then {
		resource: acm.certificate("main", "*." + settings.root_fqdn, [settings.root_fqdn], settings.route53Zone)
	} else {},
	'api_gateway.tf.json': api_gateway.rest_api('styx', {
  		parameters: {
  			endpoint_configuration: {
  				types: ["EDGE"]
  			}
  		},
  		deployment: {
  			stage_name: "v1"
  		},
  		root: {
  			children: [{
  				pathPart: "api",
  				methods: {
  					OPTIONS: {
  						optionsIntegration: true,
  						parameters: {
	  						authorization: "NONE",
	  						request_parameters: {
								"method.request.path.proxy": true
							}
						}
  					}
  				},
  				children: [{
  					pathPart: "customer",
  					methods: {
  						GET: {
  							lambdaIntegration: "styx_get_customers",
  							parameters: {
  								authorization: "AWS_IAM"
  							}
  						},
  						PUT: {
  							lambdaIntegration: "styx_put_customer",
  							parameters: {
  								authorization: "AWS_IAM"
  							}
  						},
  						OPTIONS: {
	  						optionsIntegration: true,
	  						parameters: {
		  						authorization: "NONE",
		  						request_parameters: {
									"method.request.path.proxy": true
								}
							}
	  					}
  					},
  					children: [{
  						pathPart: "{customer}",
  						methods: {
	  						DELETE: {
	  							lambdaIntegration: "styx_delete_customer",
	  							parameters: {
	  								authorization: "AWS_IAM",
	  								request_parameters: {
										"method.request.path.customer": true
									}
	  							}
	  						},
	  						OPTIONS: {
		  						optionsIntegration: true,
		  						parameters: {
			  						authorization: "NONE",
			  						request_parameters: {
										"method.request.path.proxy": true
									}
								}
		  					}
	  					},
  					}]
  				}]
  			}]
  		}
  	}),
	'api_gateway_addons.tf.json': {
		resource: {
			aws_api_gateway_account: {
				"us-west-2": {
					cloudwatch_role_arn: "${aws_iam_role.styx-apigateway_cloudwatch.arn}"
				}
			},
			aws_api_gateway_base_path_mapping: {
				styx: {
					api_id: "${aws_api_gateway_rest_api.styx.id}",
					stage_name: "${aws_api_gateway_deployment.styx.stage_name}",
					domain_name: "${aws_api_gateway_domain_name.styx.domain_name}",
					base_path: "v1"
				}
			},
			aws_api_gateway_domain_name: {
				styx: {
					certificate_arn: certificate_arn,
					domain_name: "api." + settings.root_fqdn,
					depends_on: if std.length(settings.wildcard_acm_cert_arn) == 0 then
						["aws_acm_certificate.main"]
					else []
				}
			}
		}
	},
	'backend.tf.json': backend(settings),
	'cloudfront.tf.json': {
		resource: cloudfront.resource(settings, certificate_arn),
		output: cloudfront.output
	},
	'cloudwatch-api-gateway-role.tf.json': {
		resource: iam.iam_role(
			"styx-apigateway_cloudwatch",
			"Allow APIGateway to write to CloudWatch Logs",
			{},
	        {
	        	CloudWatchPut: [{
	        		Sid: "logs",
		            Effect: "Allow",
		            Action: [
		                "logs:CreateLogGroup",
		                "logs:CreateLogStream",
		                "logs:DescribeLogGroups",
		                "logs:DescribeLogStreams",
		                "logs:PutLogEvents",
		                "logs:GetLogEvents",
		                "logs:FilterLogEvents"
		            ],
		            Resource: "arn:aws:logs:*"
	        	}]
	        },
			[{
				Effect: "Allow",
				Principal: {
					Service: "apigateway.amazonaws.com"
				},
				Action: "sts:AssumeRole"
			}]
		)
	},
	'cognito_iam_roles.tf.json': {
		resource: cognito_iam_roles.resource,
		data: cognito_iam_roles.data(settings),
		output: {
			admin_create_user_command: {
				value: "aws --region " + settings.defaultRegion + " --profile " + settings.awsProfile + " cognito-idp admin-create-user --user-pool-id ${aws_cognito_user_pool.styx.id} --username ${random_string.admin_password.keepers.admin_email} --user-attributes '[{\"Name\": \"email\", \"Value\": \"${random_string.admin_password.keepers.admin_email}\"}, {\"Name\": \"email_verified\", \"Value\": \"true\"}, {\"Name\": \"nickname\", \"Value\": \"" + settings.adminIamName + "\"}]' --temporary-password ${random_string.admin_password.result}"
			},
			admin_group_add_command: {
				value: "aws --region " + settings.defaultRegion + " --profile " + settings.awsProfile + " cognito-idp admin-add-user-to-group --user-pool-id ${aws_cognito_user_pool.styx.id} --username ${random_string.admin_password.keepers.admin_email} --group-name styx-admin"
			}
		}
	},
	'cognito.tf.json': {
		resource: cognito.resource(settings, certificate_arn)
	},
	'data.tf.json': {
		data: {
			aws_caller_identity: {
				current: {}
			}
		}
	},
	'dynamodb.tf.json': {
		resource: {
			aws_dynamodb_table: dynamodb.table(
				"styx",
				"PAY_PER_REQUEST",
				"customerName",
				null,
				[{
					name: "customerName",
					type: "S"
				},{
					name: "isGlobal",
					type: "S"
				}],
				[{
					name: "Global",
					hash_key: "isGlobal",
					range_key: "customerName",
					projection_type: "ALL"
				}],
				null
			)
		}
	},
	'keepers.tf.json': {
		resource: {
			random_string: {
				admin_password: {
					length: 16,
					special: false,
					min_numeric: 1,
					min_lower: 1,
					min_upper: 1,
					keepers: {
						admin_email: settings.adminEmail,
					}
				}
			}
		},
		output: {
			admin_password: {
				value: "${random_string.admin_password.result}",
			}
		}
	},
	'lambda_styx_get_customers.tf.json': lambda.lambda_function("styx_get_customers", {
		handler: "main.main",
		timeout: 60,
		memory_size: 512,

		environment: {
			variables: {
				TABLE: "${aws_dynamodb_table.styx.id}",
				BASEPATH: settings.root_fqdn,
				ACCOUNTID: "${data.aws_caller_identity.current.account_id}"
			}
		},

		tracing_config: {
			mode: "Active"
		}
	}, {
		statement: [{
			sid: "logs",
			actions: [
				"logs:CreateLogGroup",
				"logs:CreateLogStream",
				"logs:PutLogEvents"
			],
			resources: [
				"arn:aws:logs:*:*:*"
			]
		},{
			sid: "dynamodb",
			actions: [
				"dynamodb:Query"
			],
			resources: [
				"${aws_dynamodb_table.styx.arn}",
				"${aws_dynamodb_table.styx.arn}/index/Global"
			]
		},{
			sid: "iam",
			actions: [
				"iam:GetUser"
			],
			resources: [
				"arn:aws:iam::${data.aws_caller_identity.current.account_id}:user/*"
			]
		},{
			sid: "cognitoidp",
			actions: [
				"cognito-idp:AdminGetUser"
			],
			resources: [
				"${aws_cognito_user_pool.styx.arn}"
			]
		}]
	}),
	'lambda_styx_delete_customer.tf.json': lambda.lambda_function("styx_delete_customer", {
		handler: "main.main",
		timeout: 60,

		environment: {
			variables: {
				TABLE: "${aws_dynamodb_table.styx.id}",
				BASEPATH: settings.root_fqdn
			}
		},

		tracing_config: {
			mode: "Active"
		}
	}, {
		statement: [{
			sid: "logs",
			actions: [
				"logs:CreateLogGroup",
				"logs:CreateLogStream",
				"logs:PutLogEvents"
			],
			resources: [
				"arn:aws:logs:*:*:*"
			]
		},{
			sid: "dynamodb",
			actions: [
				"dynamodb:DeleteItem"
			],
			resources: [
				"${aws_dynamodb_table.styx.arn}"
			]
		}, {
			sid: "xray",
            actions: [
                "xray:PutTraceSegments",
                "xray:PutTelemetryRecords",
                "xray:GetSamplingRules",
                "xray:GetSamplingTargets",
                "xray:GetSamplingStatisticSummaries"
            ],
            resources: [
                "*"
            ]
        }]
	}),
	'lambda_styx_put_customer.tf.json': lambda.lambda_function("styx_put_customer", {
		handler: "main.main",
		timeout: 60,

		environment: {
			variables: {
				TABLE: "${aws_dynamodb_table.styx.id}",
				BASEPATH: settings.root_fqdn
			}
		},

		tracing_config: {
			mode: "Active"
		}
	}, {
		statement: [{
			sid: "logs",
			actions: [
				"logs:CreateLogGroup",
				"logs:CreateLogStream",
				"logs:PutLogEvents"
			],
			resources: [
				"arn:aws:logs:*:*:*"
			]
		},{
			sid: "dynamodb",
			actions: [
				"dynamodb:PutItem"
			],
			resources: [
				"${aws_dynamodb_table.styx.arn}"
			]
		}, {
			sid: "xray",
            actions: [
                "xray:PutTraceSegments",
                "xray:PutTelemetryRecords",
                "xray:GetSamplingRules",
                "xray:GetSamplingTargets",
                "xray:GetSamplingStatisticSummaries"
            ],
            resources: [
                "*"
            ]
        }]
	}),
	'lambda_styx_notifier.tf.json': lambda.lambda_function("styx_notifier", {
		handler: "main.main",
		timeout: 60,

		environment: {
			variables: {
				TABLE: "${aws_dynamodb_table.styx.id}"
			}
		},

		tracing_config: {
			mode: "Active"
		}
	}, {
		statement: [{
			sid: "logs",
			actions: [
				"logs:CreateLogGroup",
				"logs:CreateLogStream",
				"logs:PutLogEvents"
			],
			resources: [
				"arn:aws:logs:*:*:*"
			]
		},{
			sid: "dynamodb",
			actions: [
				"dynamodb:PutItem",
				"dynamodb:DeleteItem"
			],
			resources: [
				"${aws_dynamodb_table.styx.arn}"
			]
		}, {
			sid: "xray",
            actions: [
                "xray:PutTraceSegments",
                "xray:PutTelemetryRecords",
                "xray:GetSamplingRules",
                "xray:GetSamplingTargets",
                "xray:GetSamplingStatisticSummaries"
            ],
            resources: [
                "*"
            ]
        }]
	}),
	'lambda_sns_permission.tf.json': {
		resource: {
			aws_lambda_permission: {
				styx_notifier: {
					statement_id: "AllowExecutionFromSNS",
					action: "lambda:InvokeFunction",
					function_name: "${aws_lambda_function.styx_notifier.function_name}",
					principal: "sns.amazonaws.com",
					source_arn: "${aws_sns_topic.styx_cloudformation_notifier.arn}"
				}
			}
		}
	},
	'null_resources.tf.json': null_resources.resource(settings),
	'provider.tf.json': {
		terraform: {
			required_providers: {
				aws: {
					source: "hashicorp/aws",
					version: "~> 3.14.1"
				},
				random: {
					source: "hashicorp/random",
					version: "~> 3.0.0"
				}
			}
		},
		provider: [{
			aws: {
				profile: settings.awsProfile,
				region: "us-west-2"
			}
		},{
			aws: {
				alias: "us-east-1",
				profile: settings.awsProfile,
				region: "us-east-1"
			}
		}]
	},
	'route53.tf.json': {
		resource: {
			aws_route53_record: {
				"www-record": route53.record(
					settings.root_fqdn,
					settings.route53Zone,
					route53.alias(
						"${aws_cloudfront_distribution.styx.domain_name}",
						"${aws_cloudfront_distribution.styx.hosted_zone_id}"
					)
				),
				"cognito-record": route53.record(
					'cognito.' + settings.root_fqdn,
					settings.route53Zone,
					route53.alias(
						"${aws_cognito_user_pool_domain.styx.cloudfront_distribution_arn}",
						"Z2FDTNDATAQYW2"
					)
				),
				"api-record": route53.record(
					'api.' + settings.root_fqdn,
					settings.route53Zone,
					route53.alias(
						"${aws_api_gateway_domain_name.styx.cloudfront_domain_name}",
						"${aws_api_gateway_domain_name.styx.cloudfront_zone_id}"
					)
				)
			}
		}
	},
	's3.tf.json': {
		data: {
			archive_file: {
				s3_content: {
					type: "zip",
					source_dir: "${path.module}/site_content/",
					output_path: "${path.module}/lambda_functions/zip_files/s3_content.zip"
				}
			}
		},
		resource: {
			aws_s3_bucket: {
				static_site: s3.bucket("styx-site-content-"),
				logs: s3.bucket("styx-logs-") + {
					acl: "log-delivery-write"
				}
			}
		},
		output: {
			s3_static_site_sync_command: {
				value: "aws --profile " + settings.awsProfile + " s3 --region " + settings.defaultRegion + " sync ${path.module}/site_content/ s3://${aws_s3_bucket.static_site.id}"
			}
		}
	},
	's3_policies.tf.json': {
		data: {
			aws_iam_policy_document: {
				s3_static_site: {
					statement: [{
						actions: ["s3:GetObject"],
						resources: ["${aws_s3_bucket.static_site.arn}/*"],
						principals: {
							type: "AWS",
							identifiers: ["${aws_cloudfront_origin_access_identity.styx.iam_arn}"]
						}
					}]
				}
			}
		},
		resource: {
			aws_s3_bucket_policy: {
				s3_static_site: {
					bucket: "${aws_s3_bucket.static_site.id}",
					policy: "${data.aws_iam_policy_document.s3_static_site.json}"
				}
			}
		}
	},
	'sns.tf.json': {
		resource: {
			aws_sns_topic: {
				styx_cloudformation_notifier: {
					name: "styx-cloudformation-notifier"
				}
			},
			aws_sns_topic_subscription: {
				lambda_notifier: {
					topic_arn: "${aws_sns_topic.styx_cloudformation_notifier.arn}",
					protocol: "lambda",
					endpoint: "${aws_lambda_function.styx_notifier.arn}"
				}
			}
		}
	},
	'templates.tf.json': templates,
	'variables.tf.json': {
		variable: {
	    	region: {
	    		default: settings.defaultRegion
	    	},
	    	cognito_user_mfa: {
	    		default: "OFF"
	    	}
		}
	}
}