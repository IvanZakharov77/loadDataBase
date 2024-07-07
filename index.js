import express from 'express';
import fetch from 'node-fetch';
import mysql from 'mysql';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const PORT = 5000;
const app = express();

app.use(express.json());

const connection = mysql.createConnection({
  host: 'a1dia751.mysql.tools',
  user: 'a1dia751_diakommarks',
  password: 'FryBf)4*28',
  database: 'a1dia751_diakommarks',
});

const handleDisconnect = () => {
  connection.connect((err) => {
    if (err) {
      console.error('Ошибка при подключении к базе данных:', err);
      setTimeout(handleDisconnect, 2000); // Повторное подключение через 2 секунды
    } else {
      console.log('Подключено к базе данных');
      // Проверка и создание таблиц
      checkAndCreateTables();
    }
  });

  connection.on('error', (err) => {
    console.error('Ошибка соединения с базой данных:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      setTimeout(() => {
        handleDisconnect();
      }, 10000); // Повторное подключение при потере соединения
    } else {
      throw err;
    }
  });
};

// id INT AUTO_INCREMENT PRIMARY KEY,

function checkAndCreateTables() {
  const firstTableName = 'marks_info';
  const secondTableName = 'number_class';

  connection.query(`SHOW TABLES LIKE '${firstTableName}'`, (err, results) => {
    if (err) {
      console.error('Ошибка при проверке наличия таблицы', err);
    } else if (results.length === 0) {
      connection.query(
        `CREATE TABLE ${firstTableName} (
          id CHAR(36) PRIMARY KEY,
          name_marks VARCHAR(255),
          name_applicant VARCHAR(255),
          address_applicant VARCHAR(255),
          name_owner VARCHAR(255),
          address_owner VARCHAR(255),
          number VARCHAR(255),
          registration_number VARCHAR(255) UNIQUE,
          status VARCHAR(255),
          adress_img VARCHAR(255),
          last_update VARCHAR(255)
        )`,
        (err) => {
          if (err) {
            console.error('Ошибка при создании таблицы', err);
          } else {
            console.log(`Таблица ${firstTableName} успешно создана`);
          }
        }
      );
    }
  });

  connection.query(`SHOW TABLES LIKE '${secondTableName}'`, (err, results) => {
    if (err) {
      console.error('Ошибка при проверке наличия таблицы', err);
    } else if (results.length === 0) {
      connection.query(
        `CREATE TABLE ${secondTableName} (
          id INT AUTO_INCREMENT PRIMARY KEY,
          number_class INT,
          class_info VARCHAR(255),
          mark_id INT,
          FOREIGN KEY (mark_id) REFERENCES marks_info(id)
        )`,
        (err) => {
          if (err) {
            console.error('Ошибка при создании таблицы', err);
          } else {
            console.log(`Таблица ${secondTableName} успешно создана`);
          }
        }
      );
    }
  });
}

handleDisconnect();

let num = 25000;
let allPages = 56160;
const initialUrl = `https://sis.nipo.gov.ua/api/v1/open-data/?obj_type=4&`;

//
fs.readFile('number.txt', 'utf8', (err, data) => {
  if (err) {
    console.error('Ошибка при чтении файла:', err);
    return;
  }

  num = parseInt(data, 10);

  if (isNaN(num)) {
    console.error('Содержимое файла не является числом');
  } else {
    console.log('Число из файла:', num);
  }
});
//

const fetchData = async (url) => {
  let sum = 0;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Ошибка сети: ${response.status}`);
    }
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Ожидался JSON, но получен HTML');
    }
    const data = await response.json();
    for (const result of data.results) {
      const newId = uuidv4();
      const createTableMarks_info = `
        INSERT INTO marks_info (id, name_marks, name_applicant, address_applicant, name_owner, address_owner, number, registration_number, status, adress_img, last_update) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const values = [
        newId,
        result.data.WordMarkSpecification !== null &&
        result.data.WordMarkSpecification !== undefined
          ? result.data.WordMarkSpecification.MarkSignificantVerbalElement !== undefined &&
            result.data.WordMarkSpecification.MarkSignificantVerbalElement !== null
            ? result.data.WordMarkSpecification.MarkSignificantVerbalElement[0]['#text']
            : '* - інформація тимчасово обмежена'
          : '* - інформація тимчасово обмежена',
        result.data.HolderDetails !== undefined
          ? result.data.HolderDetails.Holder[0].HolderAddressBook.FormattedNameAddress.Name
              .FreeFormatName.FreeFormatNameDetails.FreeFormatNameLine
          : '* - інформація тимчасово обмежена',
        result.data.HolderDetails !== undefined
          ? result.data.HolderDetails.Holder[0].HolderAddressBook.FormattedNameAddress.Address
              .FreeFormatAddress.FreeFormatAddressLine
          : '* - інформація тимчасово обмежена',
        result.data.ApplicantDetails !== undefined
          ? result.data.ApplicantDetails.Applicant[0].ApplicantAddressBook.FormattedNameAddress.Name
              .FreeFormatName.FreeFormatNameDetails.FreeFormatNameLine
          : '* - інформація тимчасово обмежена',
        result.data.ApplicantDetails !== undefined
          ? result.data.ApplicantDetails.Applicant[0].ApplicantAddressBook.FormattedNameAddress
              .Address.FreeFormatAddress.FreeFormatAddressLine
          : '* - інформація тимчасово обмежена',
        result.data.ApplicationNumber,
        result.data.RegistrationNumber,
        result.data.registration_status_color,
        result.data.MarkImageDetails.MarkImage.MarkImageFilename,
        result.last_update,
      ];
      console.log(values);
      connection.query(createTableMarks_info, values, (err, results) => {
        if (err) {
          console.error('Ошибка при добавлении данных:', err);
        } else {
          console.log('Данные успешно добавлены');

          const classDescription = result.data.GoodsServicesDetails?.GoodsServices
            ?.ClassDescriptionDetails?.ClassDescription ?? [
            { termText: '* - інформація тимчасово обмежена' },
          ];
          try {
            classDescription.map((classDescription) => {
              const classNumber =
                classDescription.ClassNumber || '* - інформація тимчасово обмежена';
              if (classDescription?.ClassificationTermDetails?.ClassificationTerm) {
                let classRecordCounter = [
                  classDescription.ClassificationTermDetails.ClassificationTerm.length,
                ];
                // let sum = 0;
                for (let i = 0; i < classRecordCounter.length; i++) {
                  sum += classRecordCounter[i];
                }
                classRecordCounter.push();
                console.log('>>>>>>>>>>', sum);
                classDescription.ClassificationTermDetails.ClassificationTerm.map((term) => {
                  const termText = term.ClassificationTermText;
                  const createTableNumberKeys = `INSERT INTO number_class (number_class, class_info, mark_id) VALUES (?, ?, ?)`;
                  const values = [classNumber, termText, results.insertId];
                  return new Promise((resolve, reject) => {
                    connection.query(createTableNumberKeys, values, (err) => {
                      if (err) {
                        console.error('Ошибка при добавлении данных в таблицу номеров ключей', err);
                        reject(err);
                      } else {
                        console.log('Данные в таблицу ключей добавлены');
                        resolve();
                      }
                    });
                  });
                });
              } else {
                const fallbackTerm = {
                  ClassificationTermLanguageCode: '* - інформація тимчасово обмежена',
                  ClassificationTermText: '* - інформація тимчасово обмежена',
                };
                const createTableNumberKeys = `INSERT INTO number_class (number_class, class_info, mark_id) VALUES (?, ?, ?)`;
                const values = [classNumber, fallbackTerm.ClassificationTermText, results.insertId];
                return new Promise((resolve, reject) => {
                  connection.query(createTableNumberKeys, values, (err) => {
                    if (err) {
                      console.error('Ошибка при добавлении данных в таблицу номеров ключей', err);
                      reject(err);
                    } else {
                      console.log('Данные в таблицу ключей добавлены');
                      resolve();
                    }
                  });
                });
              }
            });
          } catch (error) {
            reject(error);
          }
        }
      });
    }
    console.log('mmmm', allPages);
    if (num < allPages) {
      num += 1;
      const nextUrl = `https://sis.nipo.gov.ua/api/v1/open-data/?obj_type=4&page=${num}`;
      setTimeout(() => {
        console.log('!!!!', sum);
        fetchData(nextUrl);
        fs.writeFile('number.txt', num.toString(), (error) => {
          if (error) {
            console.error('Ошибка при записи файла:', error);
          } else {
            console.log('Число успешно обновлено в файле:', num);
          }
        });
      }, 5000);
    } else {
      console.log('Загрузка данных завершена');
    }
  } catch (error) {
    num - 3;
    console.error('Ошибка при загрузке данных:', error);
  }
};

const startAllRecord = initialUrl + `page=${num}`;
fetchData(startAllRecord);

const lastUpdateMark = async () => {
  const sqllastDate = `SELECT * FROM marks_info`;
  connection.query(sqllastDate, async (err, results) => {
    if (err) console.log(err);
    let date = new Date(results[results.length - 1].last_update);
    let day = date.getDate().toString().padStart(2, '0');
    let month = (date.getMonth() + 1).toString().padStart(2, '0');
    let year = date.getFullYear();
    lastUpdate = `${day}.${month}.${year}`;
    console.log('>>>>>>>>lastdate', lastUpdate, results[results.length - 1].number);
    try {
      const response = await fetch(
        `http://sis.nipo.gov.ua/api/v1/open-data/?last_update_from=${lastUpdate}&obj_type=4&page=${num}`
      );
      if (!response.ok) {
        throw new Error(`Ошибка сети: ${response.status}`);
      }
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Ожидался JSON, но получен HTML');
      }
      const data = await response.json();
      for (const result of data.results) {
        const createTableMarks_info = `
          INSERT INTO marks_info (name_marks, name_applicant, address_applicant, name_owner, address_owner, number, registration_number, status, adress_img, last_update) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const values = [
          result.data.WordMarkSpecification !== null &&
          result.data.WordMarkSpecification !== undefined
            ? result.data.WordMarkSpecification.MarkSignificantVerbalElement !== undefined &&
              result.data.WordMarkSpecification.MarkSignificantVerbalElement !== null
              ? result.data.WordMarkSpecification.MarkSignificantVerbalElement[0]['#text']
              : '* - інформація тимчасово обмежена'
            : '* - інформація тимчасово обмежена',
          result.data.HolderDetails !== undefined
            ? result.data.HolderDetails.Holder[0].HolderAddressBook.FormattedNameAddress.Name
                .FreeFormatName.FreeFormatNameDetails.FreeFormatNameLine
            : '* - інформація тимчасово обмежена',
          result.data.HolderDetails !== undefined
            ? result.data.HolderDetails.Holder[0].HolderAddressBook.FormattedNameAddress.Address
                .FreeFormatAddress.FreeFormatAddressLine
            : '* - інформація тимчасово обмежена',
          result.data.ApplicantDetails !== undefined
            ? result.data.ApplicantDetails.Applicant[0].ApplicantAddressBook.FormattedNameAddress
                .Name.FreeFormatName.FreeFormatNameDetails.FreeFormatNameLine
            : '* - інформація тимчасово обмежена',
          result.data.ApplicantDetails !== undefined
            ? result.data.ApplicantDetails.Applicant[0].ApplicantAddressBook.FormattedNameAddress
                .Address.FreeFormatAddress.FreeFormatAddressLine
            : '* - інформація тимчасово обмежена',
          result.data.ApplicationNumber,
          result.data.RegistrationNumber,
          result.data.registration_status_color,
          result.data.MarkImageDetails.MarkImage.MarkImageFilename,
          result.last_update,
        ];
        console.log(values);
        connection.query(createTableMarks_info, values, (err, results) => {
          if (err) {
            console.error('Ошибка при добавлении данных:', err);
          } else {
            console.log('Данные успешно добавлены');

            const classDescription = result.data.GoodsServicesDetails?.GoodsServices
              ?.ClassDescriptionDetails?.ClassDescription ?? [
              { termText: '* - інформація тимчасово обмежена' },
            ];
            try {
              classDescription.map((classDescription) => {
                const classNumber =
                  classDescription.ClassNumber || '* - інформація тимчасово обмежена';
                if (classDescription?.ClassificationTermDetails?.ClassificationTerm) {
                  let classRecordCounter = [
                    classDescription.ClassificationTermDetails.ClassificationTerm.length,
                  ];
                  // let sum = 0;
                  for (let i = 0; i < classRecordCounter.length; i++) {
                    sum += classRecordCounter[i];
                  }
                  classRecordCounter.push();
                  console.log('>>>>>>>>>>', sum);
                  classDescription.ClassificationTermDetails.ClassificationTerm.map((term) => {
                    const termText = term.ClassificationTermText;
                    const createTableNumberKeys = `INSERT INTO number_class (number_class, class_info, mark_id) VALUES (?, ?, ?)`;
                    const values = [classNumber, termText, results.insertId];
                    return new Promise((resolve, reject) => {
                      connection.query(createTableNumberKeys, values, (err) => {
                        if (err) {
                          console.error(
                            'Ошибка при добавлении данных в таблицу номеров ключей',
                            err
                          );
                          reject(err);
                        } else {
                          console.log('Данные в таблицу ключей добавлены');
                          resolve();
                        }
                      });
                    });
                  });
                } else {
                  const fallbackTerm = {
                    ClassificationTermLanguageCode: '* - інформація тимчасово обмежена',
                    ClassificationTermText: '* - інформація тимчасово обмежена',
                  };
                  const createTableNumberKeys = `INSERT INTO number_class (number_class, class_info, mark_id) VALUES (?, ?, ?)`;
                  const values = [
                    classNumber,
                    fallbackTerm.ClassificationTermText,
                    results.insertId,
                  ];
                  return new Promise((resolve, reject) => {
                    connection.query(createTableNumberKeys, values, (err) => {
                      if (err) {
                        console.error('Ошибка при добавлении данных в таблицу номеров ключей', err);
                        reject(err);
                      } else {
                        console.log('Данные в таблицу ключей добавлены');
                        resolve();
                      }
                    });
                  });
                }
              });
            } catch (error) {
              reject(error);
            }
          }
        });
      }
      if (num < allPages) {
        num += 1;
        const nextUrl = `https://sis.nipo.gov.ua/api/v1/open-data/?obj_type=4&page=${num}`;
        setTimeout(() => {
          console.log('!!!!', sum);
          fetchData(nextUrl);
          fs.writeFile('number.txt', num.toString(), (error) => {
            if (error) {
              console.error('Ошибка при записи файла:', error);
            } else {
              console.log('Число успешно обновлено в файле:', num);
            }
          });
        }, 20000);
      } else {
        console.log('Загрузка данных завершена');
      }
    } catch (error) {
      console.error('Ошибка при загрузке данных:', error);
    }
  });
};

// setInterval(lastUpdateMark, 24 * 60 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
