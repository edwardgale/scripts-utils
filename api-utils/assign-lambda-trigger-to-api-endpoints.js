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

const restApiNames =
    [
        'veh-tax-class-enquiry',
        'veh-keeper-details',
        'veh-register-vehicle',
        'veh-request-vehicle-license-rates',
        'veh-reference-data',
        'veh-vehicle-validation',
        'dvla-vedr-tax-class-enquiry-service',
    ];


// apigateway.getRestApis({limit: 100}).promise()
// .then(function (data) {
//     logger.log('info', data);
//
//     console.log('Success');
// }).catch(function (err) {
//     console.log(err);
// });

Promise.map(listRestApis(region), id => {
    logger.log('info', 'hello');
    return retry({max: 1}, function() {
        return listResources(apigateway, region, id);
    })
}).catch(function (error) {
    logger.log('error', error);
}).finally(function (reason) {
    logger.log('info', 'FINALLY CLEAR UP ');
});

function listRestApis(region) {
    const apigateway = new AWS.APIGateway({region});
    const apiLimit = 500;
    return apigateway.getRestApis({limit: apiLimit}).promise()
    .then(data => {
        assert(!data.position, `More than ${apiLimit} API gateway's are not yet supported`);
        const restApis = data.items;

        // only return api's which are called by the fulfillment lambda function for this stage.
        console.log(JSON.stringify(data));
        let arr2 = []
        restApis.forEach(p => {
            if (restApiNames.includes(p.name)) {
                arr2.push(p.id);
            }
        });

        console.log(`${arr2}`);
        return arr2;
    });
}

function listResources(apigateway, region, restApiId) {
    // const apigateway = new AWS.APIGateway({region});
    const params = {restApiId: restApiId, limit: 30};
    // debug(`Fetching users - page: ${params.PaginationToken || 'first'}`);
    return apigateway.getResources(params).promise()
    .then(data => {
        logger.log('info', 'Im in there');
        data.items.forEach(item => JSON.stringify(item));
        logger.log('info', data);
        return data;
    });
}

//
// Promise.resolve(createAllFulfillmentLambdaPermissions('eu-west-1'))
//     .catch(err => {
//         console.error(err.stack);
//         process.exit(1);
//     });


function createAllFulfillmentLambdaPermissions(region) {

    const apigateway = new AWS.APIGateway({region});

    Promise.mapSeries(listRestApis(region), id => {
        // const file = path.join(dir, getFilename(id));
        // logger.log('info', `Permission for ${id}`);
        return createFulfillmentLambdaPermission(apigateway, id);
    }, {concurrency: 8});
}


function createFulfillmentLambdaPermission(apigateway, restApiId) {
    logger.log('info', `Get resources for ${restApiId}`);

    const params = {restApiId: restApiId, limit: 30};
    // debug(`Fetching users - page: ${params.PaginationToken || 'first'}`);
    return Promise.delay(500, apigateway.getResources(params).promise())
    .then(data => {
        logger.log('info', 'Im in there');

        data.items.forEach(item => JSON.stringify(item));
        logger.log('info', data);
        return data;
    });

    // return page()
    //     .finally(() => {
    //         stringify.end();
    //         return streamToPromise(stringify);
    //     })
    //     .finally(() => writeStream.end());
}


const lp = (account, env, restId, method, path) => {
    return `aws lambda add-permission --function-name ${env}-fulfillment --region eu-west-1 \
 --statement-id $(date | openssl md5 | sed 's/^.* //') \
 --action lambda:InvokeFunction \
 --principal apigateway.amazonaws.com \
 --source-arn "arn:aws:execute-api:eu-west-1:${account}:*/*/GET/*/*/*/*"`
}

// getApiValues(env);
function getApiValues(env) {
    var params = {limit: 500};
    apigateway.getRestApis(params, function (err, data) {
        if (err) {
            console.log(err, err.stack);
            exit(1);
        }

        console.log();
        data.items.map(restApi => {
            restApiNames.map(endpoint => {
                if (restApi.name === `${env}-${endpoint}`) {
                    const d = (new Date(restApi.createdDate)).toISOString().replace(/T.*/, '');
                    console.log(`${restApi.id} ${restApi.name} ${d}`);

                    // find all endpoints associated with the endpoint
                    const params = {restApiId: restApi.id, limit: 500};
                    apigateway.getResources(params, function (err, data) {
                        if (err) {
                            console.log(err, err.stack);
                            exit(1);
                        }

                        data.items.forEach(function (item) {
                            if (item.resourceMethods) {
                                if (item.resourceMethods.POST) {
                                    console.log('POSTY!');
                                }

                                if (item.resourceMethods.GET) {
                                    console.log('GETTY!');
                                }


                                console.log(item.path);
                            }
                        });
                    });

                    // aws apigateway get-resources --rest-api-id d8h2ifcttk --region eu-west-2 --query "items[].resourceMethods | length(@)"
                }
            });
        });
    });
}
