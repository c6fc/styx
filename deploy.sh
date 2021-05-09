#! /bin/bash

if [[ $1 == "" ]]; then
	TERBIN=terraform
else
	TERBIN=$1
fi

ERR=0;
if [[ ! -f $(which jsonnet) ]]; then
	ERR=1;
	echo "Error: Must have 'jsonnet' command installed.";
fi

if [[ ! -f $(which jq) ]]; then
	ERR=1;
	echo "Error: Must have 'jq' command installed.";
fi

if [[ ! -f $(which aws) ]]; then
	ERR=1;
	echo "Error: Must have AWSCLI installed.";
fi

if [[ ! -f $(which $TERBIN) ]]; then
	ERR=1;
	echo "Error: Must have Terraform installed.";
fi

if [[ `$TERBIN -v | grep v0.13 | wc -l` -ne 1 ]]; then
	ERR=1;
	echo "Error: This was build for Terraform v0.13."
fi

if [[ ! -f $(which snap) ]]; then
	if [[ $(snap list | grep $TERBIN | wc -l) ]]; then
		ERR=1;
		echo "Error: Terraform cannot be installed via snap. Download the v.13 binary manually and place it in your path."
	fi

	if [[ $(snap list | grep jsonnet | wc -l) ]]; then
		ERR=1;
		echo "Error: jsonnet cannot be installed via snap. Download the binary manually and place it in your path."
	fi

	if [[ $(snap list | grep jq | wc -l) ]]; then
		ERR=1;
		echo "Error: jq cannot be installed via snap. Install via apt or download in manually and place it in your path."
	fi
fi

if [[ "$ERR" -eq "1" ]]; then
	echo "Fix the above errors, then try again."
	exit 1
fi

BUCKET=$(jq -r '.backendBucket' settings.json)

export AWS_DEFAULT_OUTPUT=json
export AWS_DEFAULT_REGION=$(jq -r '.defaultRegion' settings.json)
export AWS_PROFILE=$(jq -r '.awsProfile' settings.json)

EXISTS=$(aws s3api get-bucket-location --bucket $BUCKET)
if [[ $? -ne 0 ]]; then
	aws s3api create-bucket --bucket $BUCKET --create-bucket-configuration LocationConstraint=$AWS_DEFAULT_REGION

	if [[ $? -ne 0 ]]; then
		echo "Error creating backendBucket. Fix that^ error then try again."
		exit 1
	fi
else
	if [[ "$( echo $EXISTS | jq -r '.LocationConstraint' )" != "$AWS_DEFAULT_REGION" ]]; then
		echo "The backendBucket you specified doesn't reside in the defaultRegion. Change one or the other, then try again."
		echo "$( echo $EXISTS | jq '.LocationConstraint' ) vs. $AWS_DEFAULT_REGION"
		exit 1
	fi
fi

echo "[*] Preparing to deploy."
echo "[*] Generating Terraform configurations"

rm -f *.tf.json
# Generate terraform configs
jsonnet -m . terraform.jsonnet

[[ ! -d .terraform ]] && $TERBIN init
$TERBIN apply --auto-approve
