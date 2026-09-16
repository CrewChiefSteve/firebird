#!/usr/bin/env bash
# Adds the three Resend sending records to the crewchiefsteve.com zone in Route 53.
# Run from C:\firebird after: aws sso login
set -e
AWS="/c/Program Files/Amazon/AWSCLIV2/aws.exe"
ZONE=$("$AWS" route53 list-hosted-zones-by-name --dns-name crewchiefsteve.com --query "HostedZones[?Name=='crewchiefsteve.com.'].Id" --output text | sed 's|/hostedzone/||')
echo "zone: $ZONE"
"$AWS" route53 change-resource-record-sets --hosted-zone-id "$ZONE" --change-batch file://ops/resend-dns.json --query "ChangeInfo.Status" --output text
