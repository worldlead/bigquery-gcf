const functions = require('@google-cloud/functions-framework');
const axios = require ('axios');
const {BigQuery} = require('@google-cloud/bigquery');

//Set API enviroment variables
const apiEnv = {
    zistemo_email: 'procosep@gmail.com',
    zistemo_pwd: 'Topdev123123!',
    zistemo_dev_key: '7ZiXnBsaVKn8uJBydTlyKqhNe55RnJdF6FQCvNlH',
    zistemo_project: 'freelance-11',
    bigquery_project: 'zistemo-bigquery',
    bigquery_dataset: 'project_report1',
    bigquery_table: 'zistemo_whole1'
}

// Create a BigQuery Client Library
const bigquery = new BigQuery({ projectId: apiEnv.bigquery_project, keyFilename: 'bigquery_key.json' });

functions.http('helloBigQuery', async (req, res) => {


//Get access token to zistemo API
const getAccessToken = async () => {

    const auth_param = {
        email: apiEnv.zistemo_email,
        password: apiEnv.zistemo_pwd,
        api_dev_key: apiEnv.zistemo_dev_key
    };

    try {
        const res = await axios.post(`https://api.zistemo.com/${apiEnv.zistemo_project}/login`, auth_param);
        const token = res.data.data.access_token;
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

const today = new Date("2023-05-15");
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
            api_dev_key: apiEnv.zistemo_dev_key
        }
 
        api_query = `https://api.zistemo.com/${apiEnv.zistemo_project}/timesheet/list?date_from=${first_date}&date_to=${current_date}`;
        const res = await axios.get(api_query, { params: credential });
        const rows = [ ...res.data.data];
        const table_data = rows.map(
            (
                {id, userName, log_date, projectName, taskName, hours, billed, documentStatusName, customer_name}
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
    
    const tableID = `${apiEnv.bigquery_dataset}.${apiEnv.bigquery_table}`;
    const whereClause = `date LIKE '${year}-${month}-%'`;
    const query = `DELETE FROM ${tableID} WHERE ${whereClause}`;

    //Delete the rows where the month is current month
    bigquery
        .query(query)
        .then(() => {
            console.log('Deletion Succeeded');
                // Insert new fetched data into the table
               bigquery
                    .dataset(apiEnv.bigquery_dataset)
                    .table(apiEnv.bigquery_table)
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







  