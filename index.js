import dotenv from 'dotenv';
dotenv.config();
import { http } from '@google-cloud/functions-framework';
import { post, get } from 'axios';
// const nodemailer = require('nodemailer');
import { BigQuery } from '@google-cloud/bigquery';

// Create a BigQuery Client Library
const bigquery = new BigQuery({ projectId: process.env.BIGQUERY_PROJECT, keyFilename: 'bigquery_key.json' });

http('helloBigQuery', async (req, res) => {
    //Get access token to zistemo API
    const getAccessToken = async () => {

        const auth_param = {
            email: process.env.ZISTEMO_EMAIL,
            password: process.env.ZISTEMO_PWD,
            api_dev_key: process.env.ZISTEMO_DEV_KEY
        };

        try {
            const response = await post(`https://api.zistemo.com/${process.env.ZISTEMO_PROJECT}/login`, auth_param);
            const token = response.data.data.access_token;
            return token;
        } catch(error) {
            console.error(error);
        }
    }

    //Get only date without time
    const getOnlyDate = (dateobj) => {
        // Set the time to 00:00:00
        dateobj.setHours(0, 0, 0, 0);
        // Get the date without the time
        var dateWithoutTime = dateobj.toISOString().split('T')[0];
        // console.log(dateWithoutTime);
        return dateWithoutTime;
    }

    const today = new Date("2023-05-11");
    const first_day = new Date(today.getFullYear(), today.getMonth(), 2);

    //Get only date without time
    const current_date = getOnlyDate(today);
    const first_date = getOnlyDate(first_day);

    //Extract the data from zistemo
    const fetchData = async () => {
        
        let api_query = "";

        try {
            //Credential for zistemo API
            const credential = {
                token: await getAccessToken(),
                api_dev_key: process.env.ZISTEMO_DEV_KEY
            }
    
            api_query = `https://api.zistemo.com/${process.env.ZISTEMO_PROJECT}/timesheet/list?date_from=${first_date}&date_to=${current_date}`;
            const response = await get(api_query, { params: credential });
            const rows = [ ...response.data.data];
            const table_data = rows.map(
                (
                    {id, log_date, userName, customer_name, projectName, taskName, hours, billed, documentStatusName}
                )=>(
                    {
                        id,
                        "date":log_date,
                        userName,
                        "customerName":customer_name,
                        projectName,
                        taskName,
                        "workhrs":parseFloat(hours),
                        billed,
                        "docStatus":documentStatusName
                    }
                )).reverse();
            
            return table_data;

        } catch (error) {
            console.error(error);
        }
    }


    //Inesrt the fetched data into a bigquery table
    const insertData = async () => {
        
        const records = await fetchData();

        const year = today.getFullYear();
        let month = (today.getMonth() + 1).toString();
        if (month.length < 2) {
            month = '0' + month;
        }
        
        
        const tableID = `${process.env.BIGQUERY_DATASET}.${process.env.BIGQUERY_TABLE}`;
        const whereClause = `date LIKE '${year}-${month}-%'`;
        const query = `DELETE FROM ${tableID} WHERE ${whereClause}`;

        //Delete the rows where the month is current month
        bigquery
            .query(query)
            .then(() => {
                console.log('Deletion Succeeded');
                // Insert new fetched data into the table
                bigquery
                    .dataset(process.env.BIGQUERY_DATASET)
                    .table(process.env.BIGQUERY_TABLE)
                    .insert(records)
                    .then(() => {
                        console.log('Data Insertion Succeeded!');
                    })
                    .catch((err) => {
                        console.error('Error: ', err);
                    });
            })
            .catch((err) => {
                console.error('Error: ', err);
            });
        res.status(200).send("success");
    };
    insertData();

});







  







  