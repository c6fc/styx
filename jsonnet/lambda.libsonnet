local lambda_function(name, config, role_policy) = {
	"resource": {
		"aws_lambda_function": {
			[name]: config + {
				"function_name": name,
				"filename": "./lambda_functions/zip_files/" + name + ".zip",
				"source_code_hash": "${data.archive_file." + name + ".output_base64sha256}",
				"runtime": "nodejs12.x",
				"role": "${aws_iam_role.lambda-" + name + ".arn}",
				"depends_on": ["data.archive_file." + name, "aws_iam_role_policy.lambda-" + name],
			}
		},
		"null_resource": {
			["npm_install-" + name]: {
				"provisioner": [{
					"local-exec": {
						"command": "cd ${path.module}/lambda_functions/" + name + "/ && npm install",
					}
				}]
			}
		},
		"aws_iam_role": {
			["lambda-" + name]: {
				"name": "lambda_" + name,
				"description": "Lambda Role for " + name,
				"assume_role_policy": '{"Version": "2012-10-17","Statement": [{
					"Effect": "Allow","Principal": {"Service": ["lambda.amazonaws.com"]},
					"Action": "sts:AssumeRole"
				}]}'
			}
		},
		"aws_iam_role_policy": {
			["lambda-" + name]: {
				"name": "lambda_" + name,
				"role": "${aws_iam_role.lambda-" + name + ".id}",

				"policy": "${data.aws_iam_policy_document.lambda-" + name + ".json}",
			}
		},
		"aws_iam_policy_attachment":: {
			["lambda-" + name + "-xray"]: {
				"name": "lambda-" + name + "-xray",
				"roles": ["${aws_iam_role.lambda-" + name + ".id}"],

				"policy_arn": "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
			}
		}
	},
	"data": {
		"archive_file": {
			[name]: {
				"depends_on": [
					"null_resource.npm_install-" + name
				],
				"type": "zip",
				"source_dir": "${path.module}/lambda_functions/" + name + "/",
				"output_path": "${path.module}/lambda_functions/zip_files/" + name + ".zip",
			}
		},
		"aws_iam_policy_document": {
			["lambda-" + name]: role_policy
		}
	}
};

local cloudwatch_trigger(name, schedule_expression) = {
	"resource": {
		"aws_lambda_permission": {
			[name]: {
				"statement_id": "AllowExecutionFromCloudWatch",
				"action": "lambda:InvokeFunction",
				"function_name": "${aws_lambda_function." + name + ".function_name}",
				"principal": "events.amazonaws.com",
				"source_arn": "${aws_cloudwatch_event_rule." + name + ".arn}"
			}
		},
		"aws_cloudwatch_event_rule": {
			[name]: {
				name: name,
				schedule_expression: schedule_expression
			}
		},
		"aws_cloudwatch_event_target": {
			[name]: {
				rule: name,
				target_id: name,
				arn: "${aws_lambda_function." + name + ".arn}"
			}
		}
	}
};

{
	"lambda_function": lambda_function,
	"cloudwatch_trigger": cloudwatch_trigger
}