#!/usr/bin/env node
const Promise = require('bluebird');
const retry = require('retry-bluebird');
const assert = require('assert');
const winston = require('winston');
const AWS = require('aws-sdk');

AWS.config.setPromisesDependency(require('bluebird'));

const logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({'timestamp': true})
    ]
});

const argv = require('yargs')
.option('env', {
    alias: 'e',
    describe: 'Choose a target environment',
    choices: ['dev', 'int', 'uat'],
    demandOption: true,
    defaultDescription: 'Target environment must be specified.  Please re-run using the -e option',
})
.option('region', {
    alias: 'r',
    describe: 'Choose a target region',
    default: 'eu-west-1',
})
.argv;

const region = argv.region;
const env = argv.env;
AWS.config.update({region: region});
const apigateway = new AWS.APIGateway();
let origApiData = '';
let newApiData = '';

Promise.resolve(getApiKey(apigateway, 'edward.gale@gmail.com'))
.then(data => duplicateApiKey(apigateway, data))
.then(data => removeApiKey(apigateway, origApiData.id))
.catch(function (error) {
    logger.log('error', error);
}).finally(function (reason) {
    logger.log('New api key data is ', newApiData);
});

function getApiKey(apigateway, name) {
    var params = {
        includeValues: true,
        limit: 1000,
        nameQuery: name,
    };
    return apigateway.getApiKeys(params).promise()
    .then(data => {
        assert(!data.position, `More than 1000 API key's are not yet supported`);

        const apiKeys = data.items;
        let arr = [];
        apiKeys.forEach(apiKey => {
            if (apiKey.name === name) {
                console.log('name match' + apiKey.name);
                origApiData = apiKey;
                arr.push(apiKey);
            }
        });

        assert(arr.length === 1, (arr.length > 1) ? `More than 1 api key found for ${name}` : `No api key found for ${name}`);
        console.log(arr[0]);
        return arr[0];
    });
}

// create new api key from old id
// find usage plans with old id
//
function duplicateApiKey(apigateway, oldApiKey) {
    console.log('going for the duplication' + oldApiKey.name);
    return Promise.all([createApiKey(apigateway, oldApiKey), getUsagePlans(apigateway, oldApiKey)])
        .then(data => {
            console.log(`new apikey ${data[0]} to be assigned to  ${data[1]}`);
            return assignKeyToUsagePlans(apigateway, data[0], data[1]);
        });
}

function createApiKey(apigateway, apiKeyTemplate) {
    console.log('going for create apikey ' +  apiKeyTemplate.name);
    var params = {
        description: apiKeyTemplate.description,
        enabled: apiKeyTemplate.enabled,
        generateDistinctId: true,
        name: apiKeyTemplate.name,
    };
    return apigateway.createApiKey(params).promise()
    .then(data => {
        newApiData = data;
        return data.id;
    })
}

function removeApiKey(apigateway, apiKeyId) {
    console.log('going for remove apikey ' +  apiKeyId);
    var params = {
        apiKey: apiKeyId
    };
    return apigateway.deleteApiKey(params).promise();
}

function getUsagePlans(apigateway, apiKeyTemplate) {
    var params = {
        keyId: apiKeyTemplate.id,
        limit: 200,
    };
    return apigateway.getUsagePlans(params).promise()
    .then(data => {
        assert(!data.position, `More than 200 Usage plans are not yet supported`);
        const items = data.items;
        return items.map(item => item.id);
    });
}

function assignKeyToUsagePlans(apigateway, apiKeyId, usagePlans) {
    return usagePlans.map(id => {
        var params = {
            keyId: apiKeyId,
            keyType: 'API_KEY',
            usagePlanId: id
        };
        return apigateway.createUsagePlanKey(params).promise();
    })
}
