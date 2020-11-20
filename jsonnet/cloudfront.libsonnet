
{
	resource(settings, certificate_arn): {
		"aws_cloudfront_origin_access_identity": {
			"styx": {
				"comment": "OAI for Styx",
			},
		},
		"aws_cloudfront_distribution": {
			"styx": {
				"comment": "Styx",
				"enabled": true,
				"is_ipv6_enabled": false,
				"default_root_object": "index.html",
				"logging_config": {
					"include_cookies": false,
					"bucket": "${aws_s3_bucket.logs.bucket_domain_name}",
					"prefix": "cloudfront",
				},
				"origin": {
					"domain_name": "${aws_s3_bucket.static_site.bucket_regional_domain_name}",
					"origin_id": "static",

					"s3_origin_config": {
						"origin_access_identity": "${aws_cloudfront_origin_access_identity.styx.cloudfront_access_identity_path}",
					}
				},
				"default_cache_behavior": {
					"allowed_methods": ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"],
					"cached_methods": ["GET", "HEAD"],
					"target_origin_id": "static",
					"forwarded_values": {
						"query_string": false,

						"cookies": {
							"forward": "none",
						}
					},
					"viewer_protocol_policy": "redirect-to-https",
					"min_ttl": 0,
					"max_ttl": 300,
					"default_ttl": 0,
				},
				"price_class": "PriceClass_100",
				"restrictions": {
					"geo_restriction": {
						"restriction_type": "none",
					}
				},

				"aliases": [settings.root_fqdn],
				"viewer_certificate": {
					"cloudfront_default_certificate": false,
					"acm_certificate_arn": certificate_arn,
					"ssl_support_method": "sni-only",
				},
				"depends_on": if std.length(settings.wildcard_acm_cert_arn) == 0 then
					["aws_acm_certificate_validation.main"]
				else []
			}
		}
	},
	"output": {
		"cloudfront_url": {
			"value": "${aws_cloudfront_distribution.styx.domain_name}"
		}
	}
}