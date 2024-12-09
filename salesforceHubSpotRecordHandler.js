const axios = require('axios');

// Example trigger from Salesforce
const trigger = {
    type: "Contact", // e.g. "Contact", "Lead", "Account"
    ID: "003XXXXXXXXXXXXXXX",
    email: "contact@example.com",
    website: "https://www.spotdev.co.uk",
    contact_or_account: "Contact", // For leads, specifies "Contact" or "Account"
    FirstName: "John",
    LastName: "Doe",
    Title: "Chief Punctuality Officer",
    Phone: "+44 1234 567890"
};

// Mapping objects: Salesforce property name -> HubSpot property name
const contactMappings = {
    "First Name": "firstname",
    "Last Name": "lastname",
    "Email": "email",
    "Phone": "phone"
};

const accountMappings = {
    "Name": "name",
    "Phone": "phone",
    "Annual Revenue": "annualrevenue"
};

const leadAsContactMappings = {
    "FirstName": "firstname",
    "LastName": "lastname",
    "Company": "company",
    "Phone": "phone"
};

const leadAsAccountMappings = {
    "AccountName": "name",
    "Website": "website",
    "industry_c": "industry"
};

// Salesforce to HubSpot property map for the SFDC record ID fields
const sfdcIdPropertiesInHubSpot = {
    "contact": "sfdc_contact_id",
    "lead": "sfdc_company_id",
    "account": "sfdc_account_id"
};

const sfdcContactOrLead = trigger.contact_or_account;

// Route the trigger based on its type
if (trigger.type === "Contact") {
	receivedSalesforceContact(trigger, "contact", contactMappings);
} else if (trigger.type === "Account") {
	receivedSalesforceAccount(trigger, "account", accountMappings);
} else if (trigger.type === "Lead") {
	receivedSalesforceLead(trigger);
} else {
	console.error(
		`Trigger received Record ID ${trigger.ID} that was not a Contact, Account or Lead`
	);
}

async function receivedSalesforceContact(
	salesforceRecord,
	objectType,
	propertyMappings
) {
	const sfdcId = await appendSfdcId(
		"contacts",
		"email",
		salesforceRecord.email,
		salesforceRecord.ID
	);

	const hsProperties = {
		properties: {
			email: salesforceRecord.email,
			[sfdcIdPropertiesInHubSpot[objectType]]: sfdcId,
		},
	};

	// Map any other fields
	mapSalesforceToHubSpotProperties(
		salesforceRecord,
		hsProperties.properties,
		propertyMappings
	);

	// This is an example. In production, make sure you're upserting or handling lookup logic as necessary
	try {
		await axios.post(
			"https://api.hubapi.com/crm/v3/objects/contacts",
			hsProperties,
			{
				headers: {
					Authorization: `Bearer ${process.env.HUBSPOT_TOKEN}`,
					"Content-Type": "application/json",
				},
			}
		);
		console.log(
			`HubSpot contact upserted for Salesforce ${objectType} ID: ${salesforceRecord.ID}`
		);
	} catch (err) {
		console.error(`Error upserting HubSpot contact: ${err.message}`);
	}
}

async function receivedSalesforceAccount(
	salesforceRecord,
	objectType,
	propertyMappings
) {
	const domain = transformWebsiteUrlToDomain(salesforceRecord.website);
	const sfdcId = await appendSfdcId(
		"companies",
		"domain",
		domain,
		salesforceRecord.ID
	);

	const hsProperties = {
		properties: {
			domain: domain,
			[sfdcIdPropertiesInHubSpot[objectType]]: sfdcId,
		},
	};

	// Map any other fields
	mapSalesforceToHubSpotProperties(
		salesforceRecord,
		hsProperties.properties,
		propertyMappings
	);

	// This is an example. In production, make sure you're upserting or handling lookup logic as necessary
	try {
		await axios.post(
			"https://api.hubapi.com/crm/v3/objects/companies",
			hsProperties,
			{
				headers: {
					Authorization: `Bearer ${process.env.HUBSPOT_TOKEN}`,
					"Content-Type": "application/json",
				},
			}
		);
		console.log(
			`HubSpot company upserted for Salesforce ${objectType} ID: ${salesforceRecord.ID}`
		);
	} catch (err) {
		console.error(`Error upserting HubSpot company: ${err.message}`);
	}
}

async function receivedSalesforceLead(salesforceRecord) {
	const contactOrAccountValue = salesforceRecord[sfdcContactOrLead];

	if (contactOrAccountValue === "Contact") {
		// Treat as a Contact
		await receivedSalesforceContact(
			salesforceRecord,
			"contact",
			leadAsContactMappings
		);
	} else if (contactOrAccountValue === "Account") {
		// Treat as an Account
		await receivedSalesforceAccount(
			salesforceRecord,
			"account",
			leadAsAccountMappings
		);
	} else {
		console.error(
			`New Salesforce Lead (ID: ${salesforceRecord.ID}) that was neither a Contact nor Account`
		);
	}
}

// Maps Salesforce fields to HubSpot fields using the provided mapping object
function mapSalesforceToHubSpotProperties(
	salesforceRecord,
	hsPropertyObject,
	mappingObject
) {
	for (const [sfField, hsField] of Object.entries(mappingObject)) {
		if (sfField in salesforceRecord) {
			hsPropertyObject[hsField] = salesforceRecord[sfField];
		}
	}
}

// Transform a given website URL into a brand domain + TLD (no subdomains)
function transformWebsiteUrlToDomain(websiteUrl) {
	try {
		const urlObj = new URL(websiteUrl);
		let hostname = urlObj.hostname.toLowerCase();
		let parts = hostname.split(".");

		// Check if domain ends with 'co.uk' or similar two-level TLD
		const lastTwo = parts.slice(-2).join(".");
		if (lastTwo === "co.uk") {
			// Keep the last three parts if available (e.g., "spotdev.co.uk")
			// Remove any leading subdomains (e.g. "www.blog.spotdev.co.uk" -> "spotdev.co.uk")
			if (parts.length > 3) {
				parts = parts.slice(-3);
			}
		} else {
			// For single-level TLDs (e.g. "com"), keep last two parts (e.g. "facebook.com")
			if (parts.length > 2) {
				parts = parts.slice(-2);
			}
		}

		return parts.join(".");
	} catch (e) {
		// If parsing fails, return as is
		return websiteUrl;
	}
}

// Helper function to append new SFDC ID to existing value
async function appendSfdcId(objectType, searchProperty, searchValue, newId) {
	let existingIdValue = "";
	try {
		const response = await axios.get(
			`https://api.hubapi.com/crm/v3/objects/${objectType}/search`,
			{
				headers: {
					Authorization: `Bearer ${process.env.HUBSPOT_TOKEN}`,
					"Content-Type": "application/json",
				},
				data: {
					filterGroups: [
						{
							filters: [
								{
									propertyName: searchProperty,
									operator: "EQ",
									value: searchValue,
								},
							],
						},
					],
				},
			}
		);

		if (response.data.results.length > 0) {
			existingIdValue =
				response.data.results[0].properties[
					sfdcIdPropertiesInHubSpot[objectType]
				] || "";
		}
	} catch (err) {
		console.error(`Error fetching existing ${objectType}: ${err.message}`);
	}

	return existingIdValue ? `${existingIdValue};${newId}` : newId;
}