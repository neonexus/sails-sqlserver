/**
 * Utility Functions
 */

// Dependencies
var _ = require('lodash');

// Module Exports

var utils = module.exports = {};

/**
 * Prepare values
 *
 * Transform a JS date to SQL date and functions
 * to strings.
 */

utils.prepareValue = function(value) {

  if(!value) return value;

  // Cast functions to strings
  if (_.isFunction(value)) {
    value = value.toString();
  }

  // Store Arrays and Objects as strings
  if (Array.isArray(value) || value.constructor && value.constructor.name === 'Object') {
    try {
      value = JSON.stringify(value);
    } catch (e) {
      // just keep the value and let the db handle an error
      value = value;
    }
  }

  return value;
};

/**
 * Given a recorset (the result set coming from MSSQL) this function will
 * inspect result and remove blank spaces if present.
 * In example: Supose there are a recordset containing an object like this:
 * {
 *   {
 *     "age":"45",
 *     "email":"myemail@dom.com   "
 *   },
 *   {
 *     "age":"45  ",
 *     "email":"myemail@dom.com"
 *   }
 * }
 *
 * it will return the following transformed object:
 *
 * {
 *   {
 *     "age":"45",
 *     "email":"myemail@dom.com"
 *   },
 *   {
 *     "age":"45",
 *     "email":"myemail@dom.com"
 *   }
 * }
 *
 * @param recordset the recorset from which blank spaces will be removed
 * @returns {*} the modified recorset, without blank spaces in its values
 */
utils.removeBlankSpaces = function(recordset){
  if(!recordset) return;
  Object.keys(recordset).forEach(function(rid){
    Object.keys(recordset[rid]).forEach(function(prop){
      var value = recordset[rid][prop];
      if(typeof value === "string") recordset[rid][prop] = value.trim();
    })
  });
  return recordset;
}

utils.buildOrderByStatement = function(criteria){
	var queryPart = 'ORDER BY ';

	// Sort through each sort attribute criteria
	_.each(criteria.sort, function(direction, attrName) {

		queryPart += '[' + attrName + '] ';

		// Basic MongoDB-style numeric sort direction
		if (direction === 1) {
			queryPart += 'ASC, ';
		} else {
			queryPart += 'DESC, ';
		}
	});

	// Remove trailing comma
	if(queryPart.slice(-2) === ', ') {
		queryPart = queryPart.slice(0, -2) + ' ';
	}
	return queryPart;
};

/**
 * Builds a Select statement determining if Aggeregate options are needed.
 */

utils.buildSelectStatement = function(criteria, table) {

  var query = 'SELECT ';

  if(criteria.groupBy || criteria.sum || criteria.average || criteria.min || criteria.max) {

    // Append groupBy columns to select statement
    if(criteria.groupBy) {
      if(criteria.groupBy instanceof Array) {
        criteria.groupBy.forEach(function(opt){
          query += '[' + opt + '], ';
        });

      } else {
        query += '[' + criteria.groupBy + '], ';
      }
    }

    // Handle SUM
    if (criteria.sum) {
      if(criteria.sum instanceof Array) {
        criteria.sum.forEach(function(opt){
          query += 'SUM([' + opt + ']) AS [' + opt + '], ';
        });

      } else {
        query += 'SUM([' + criteria.sum + ']) AS [' + criteria.sum + '], ';
      }
    }

    // Handle AVG (casting to float to fix percision with trailing zeros)
    if (criteria.average) {
      if(criteria.average instanceof Array) {
        criteria.average.forEach(function(opt){
          query += 'AVG(CAST([' + opt + '] AS FLOAT)) AS [' + opt + '], ';
        });

      } else {
        query += 'AVG(CAST([' + criteria.average + '] AS FLOAT)) AS [' + criteria.average + '], ';
      }
    }

    // Handle MAX
    if (criteria.max) {
      if(criteria.max instanceof Array) {
        criteria.max.forEach(function(opt){
          query += 'MAX([' + opt + ']) AS [' + opt + '], ';
        });

      } else {
        query += 'MAX([' + criteria.max + ']) AS [' + criteria.max + '], ';
      }
    }

    // Handle MIN
    if (criteria.min) {
      if(criteria.min instanceof Array) {
        criteria.min.forEach(function(opt){
          query += 'MIN([' + opt + ']) AS [' + opt + '], ';
        });

      } else {
        query += 'MIN([' + criteria.min + ']) AS [' + criteria.min + '], ';
      }
    }

    // trim trailing comma
    query = query.slice(0, -2) + ' ';

    // Add FROM clause
    return query += 'FROM [' + table + '] ';
  }



  //HANDLE SKIP
  if (criteria.skip){
	  var primaryKeySort = {};
	  primaryKeySort[criteria.__primaryKey__] = 1;
	  //@todo what to do with no primary key OR sort?
	  criteria.sort = criteria.sort || primaryKeySort;
	  query += 'ROW_NUMBER() OVER (' +
		  utils.buildOrderByStatement(criteria) +
		  ') AS \'__rownum__\', ';
  }
  else if (criteria.limit) {
  // SQL Server implementation of LIMIT
    query += 'TOP ' + criteria.limit + ' ';
  }

  return query += '* FROM [' + table + '] ';
};
