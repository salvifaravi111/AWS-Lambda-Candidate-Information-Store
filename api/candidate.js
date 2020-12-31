'use strict';

const uuid = require('uuid');
const AWS = require('aws-sdk');

AWS.config.setPromisesDependency(require('bluebird'));

const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports.submit = (event, context, callback) => {
	if (!event.body){ 
		console.log('No data'); 
		return callback(new Error('Not working'));
	}
	console.log(event.body);
	const requestBody = JSON.parse(event.body);
	//console.log(event.body);
	const fullname = requestBody.fullname;
	const email = requestBody.email;
	const experience = requestBody.experience;
	console.log(typeof fullname);
	console.log(typeof email);
	console.log(typeof experience);
	
	if (typeof fullname !== 'string' || typeof email !== 'string' || typeof experience !== 'number') {
		console.error('Validation Failed');
		callback(new Error('Couldn\'t submit candidate because of validation errors'));
		return;
	}
	
	submitCandidateP(candidateInfo(fullname, email, experience)).then(res => {
		callback(null, {
			statusCode: 200,
			body: JSON.stringify({
				message: 'Sucessfully submitted candidate with email',
				candidateId: res.id
			})
		});
	})
	.catch(err => {
		console.log(err);
		callback(null, {
			statusCode: 500,
			body: JSON.stringify({
				message: 'Unable to submit candidate with email'
			})
		});
	});
};

const submitCandidateP = candidate => {
	console.log('Submitting Candidate');
	const candidateInfo = {
		TableName: process.env.CANDIDATE_TABLE,
		Item: candidate,
	};
	return dynamoDb.put(candidateInfo).promise().then(res => candidate);
};

const candidateInfo = (fullname, email, experience) => {
	const timestamp = new Date().getTime();
	return {
		id: uuid.v1(),
		fullname: fullname,
		email: email,
		experience: experience,
		submittedAt: timestamp,
		updatedAt: timestamp,
	};
};

module.exports.list = (event, context, callback) => {
	var params = {
		TableName: process.env.CANDIDATE_TABLE,
		ProjectionExpression: "id, fullname, email"
	};
	
	console.log("Scanning Candidate Table");
	
	const onScan = (err, data) => {
		if (err) {
			console.log('Scan failed to load data. Error JSON:', JSON.stringify(err, null, 2));
			callback(err);
		}else {
			console.log("Scan succeeded");
			return callback(null, {
				statusCode: 200,
				body: JSON.stringify({
					candidates: data.Items
				})
			});
		}
	};
	
	dynamoDb.scan(params, onScan);
};

module.exports.get = (event, context, callback) => {
	const params = {
		TableName: process.env.CANDIDATE_TABLE,
		Key: {
			id: event.pathParameters.id,
		},
	};
	
	dynamoDb.get(params).promise().then(result => {
		const response = {
			statusCode: 200,
			body: JSON.stringify(result.Item),
		};
		callback(null, response);
	})
	.catch(error => {
		console.error(error);
		callback(new Error('Could not fetch candidate.'));
		return;
	});
};