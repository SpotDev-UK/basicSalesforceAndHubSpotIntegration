# Salesforce-HubSpot Record Handler

## Overview
This code demonstrates a conceptual integration between Salesforce and HubSpot, showcasing data synchronisation patterns. The implementation addresses several common integration challenges:

- **Salesforce Lead Handling**: Converting Salesforce leads into either HubSpot contacts or companies based on organisational requirements
- **Cross-Platform Property Mapping**: Translating field names between Salesforce and HubSpot systems
- **Domain Normalisation**: Converting website URLs from Salesforce into standardised domain formats for HubSpot

## Key Components

### Trigger Management
The system responds to Salesforce triggers for different record types:
- Contacts → `receivedSalesforceContact()`
- Accounts → `receivedSalesforceAccount()`
- Leads → `receivedSalesforceLead()`

### Property Mappings
Defined mapping objects facilitate field translation between systems:
- `contactMappings`
- `accountMappings`
- `leadAsContactMappings`
- `leadAsAccountMappings`

### Core Handler Functions

#### Contact Handler
`receivedSalesforceContact()`
- Creates/updates HubSpot contacts from Salesforce records
- Constructs HubSpot property objects
- Implements field mapping
- Executes HubSpot API upsert operations

#### Account Handler
`receivedSalesforceAccount()`
- Creates/updates HubSpot companies from Salesforce records
- Normalises website URLs to domains
- Constructs property objects
- Executes company upsert operations

#### Lead Handler
`receivedSalesforceLead()`
- Determines appropriate HubSpot record type (contact/company)
- Routes to relevant handler function

### Utility Functions

#### Property Mapper
`mapSalesforceToHubSpotProperties()`
- Translates Salesforce fields to HubSpot equivalents using mapping definitions

#### Domain Transformer
`transformWebsiteUrlToDomain()`
- Converts full URLs to domain names
- Handles various domain patterns (including ccTLDs like .co.uk)

## Customisation Guide
This foundation code requires adaptation for specific use cases:

- **Extended Mappings**: Add organisation-specific field mappings
- **Enhanced Error Handling**: Implement robust error management
- **Security Implementation**: Add appropriate authentication
- **Duplicate Management**: Implement record matching logic

## Licensing
Copyright © SpotDev Services Ltd. All rights reserved.

This code is proprietary and requires written permission for any use or reproduction. For licensing enquiries, please contact:
- Email: hello@spotdev.co.uk
