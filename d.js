import express from 'express';
import fetch from 'node-fetch';
import mysql from 'mysql';
import fs from 'fs';
import cron from 'node-cron';

const PORT = 5000;
const app = express();

app.use(express.json());

const connection = mysql.createConnection({
  host: 'a1dia751.mysql.tools',
  user: 'a1dia751_diakommarks',
  password: 'FryBf)4*28',
  database: 'a1dia751_diakommarks',
});

connection.connect((err) => {
  if (err) {
    console.error('эррор при подключении к базе вп', err);
  } else {
    console.log('конектед к бд');
    // переменные с именами таблиц
    const firstTableName = 'marks_info';
    const secondTableName = 'number_class';

    // проверяем есть ли таблица с марками именами
    connection.query(`SHOW TABLES LIKE '${firstTableName}'`, (err, results) => {
      if (err) {
        console.error('Ошибка при проверке наличия таблицы', err);
      } else {
        // создаем таблицу с именами марок тм
        if (results.length === 0) {
          connection.query(
            `CREATE TABLE  ${firstTableName} (
                              id INT AUTO_INCREMENT PRIMARY KEY,
                              name_marks VARCHAR(255),
                              name_applicant VARCHAR(255),
                              address_applicant VARCHAR(255),
                              name_owner VARCHAR(255),
                              address_owner VARCHAR(255),
                              number VARCHAR(255)  UNIQUE,
                              registration_number VARCHAR(255),
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
      }
    });

    // проверяем есть ли таблица с инфой по классам
    connection.query(`SHOW TABLES LIKE '${secondTableName}'`, (err, results) => {
      if (err) {
        console.error('Ошибка при проверке наличия таблицы', err);
      } else {
        // создание таблицы с инфо по классам
        if (results.length === 0) {
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
      }
    });
  }
});
//

// нужные перменные
let lastUpdate;
let allPages;

const initialUrl = `https://sis.nipo.gov.ua/api/v1/open-data/?obj_type=4&`;

const gettingСount = (url) => {
  fetch(url)
    .then((res) => res.json())
    .then((data) => {
      allPages = Math.ceil(data.count / 10);
    });
};
gettingСount(initialUrl);

// ------- первоначальная загрузка основной базы данных
let num = 1;
// переменные для записи данных сначала в масси а потом уже из них в бд
const arrName = [];
const arrKeysInfo = [];
//
const fetchData = async (url) => {
  return await new Promise((resolve, reject) => {
    setTimeout(() => {
      fetch(url)
        .then((res) => res.json())
        .then((data) => {
          for (const result of data.results) {
            const createTableMarks_info = `
            INSERT INTO marks_info (name_marks, name_applicant, address_applicant, name_owner, address_owner, number, registration_number,  status,   adress_img, last_update) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;
            const values = [
              result.data.WordMarkSpecification.MarkSignificantVerbalElement[0]['#text'],
              result.data.HolderDetails !== undefined
                ? result.data.HolderDetails.Holder[0].HolderAddressBook.FormattedNameAddress.Name
                    .FreeFormatName.FreeFormatNameDetails.FreeFormatNameLine
                : '* - інформація тимчасово обмежена',
              result.data.HolderDetails !== undefined
                ? result.data.HolderDetails.Holder[0].HolderAddressBook.FormattedNameAddress.Address
                    .FreeFormatAddress.FreeFormatAddressLine
                : '* - інформація тимчасово обмежена',
              result.data.ApplicantDetails !== undefined
                ? result.data.ApplicantDetails.Applicant[0].ApplicantAddressBook
                    .FormattedNameAddress.Name.FreeFormatName.FreeFormatNameDetails
                    .FreeFormatNameLine
                : '* - інформація тимчасово обмежена',
              result.data.ApplicantDetails !== undefined
                ? result.data.ApplicantDetails.Applicant[0].ApplicantAddressBook
                    .FormattedNameAddress.Address.FreeFormatAddress.FreeFormatAddressLine
                : '* - інформація тимчасово обмежена',
              result.data.ApplicationNumber,
              result.data.RegistrationNumber,
              result.data.registration_status_color,
              result.data.MarkImageDetails.MarkImage.MarkImageFilename,
              result.last_update,
            ];
            arrName.push(values);
            if (arrName.length === 10) {
              arrName.forEach((arr) =>
                connection.query(createTableMarks_info, arr, (err, results) => {
                  if (err) {
                    console.error('Ошибка при добавлении данных:', err);
                  } else {
                    console.log('Данные успешно добавлены');
                    setTimeout(() => {
                      arrName.splice(0, arrName.length);
                      console.log('имена марок очищены');
                      // Очистка массива
                    }, 2500);
                    const classDescription =
                      result.data.GoodsServicesDetails.GoodsServices.ClassDescriptionDetails
                        .ClassDescription[0];
                    const classNumber = classDescription.ClassNumber;

                    classDescription.ClassificationTermDetails.ClassificationTerm.forEach(
                      (term) => {
                        const termText = term.ClassificationTermText;

                        const createTableNumberKeys = `INSERT INTO number_class (number_class, class_info, mark_id) VALUES (?, ?, ?)`;
                        const values = [classNumber, termText, results.insertId];
                        arrKeysInfo.push(values);

                        if (arrKeysInfo.length === arrKeysInfo.length) {
                          arrKeysInfo.forEach((arr) =>
                            connection.query(createTableNumberKeys, arr, (err) => {
                              if (err) {
                                console.error(
                                  'Ошибка при добавлении данных в таблицу номеров ключей',
                                  err
                                );
                              } else {
                                console.log('Данные в таблицу ключей добавлены');
                                setTimeout(() => {
                                  arrKeysInfo.splice(0, arrName.length);
                                  console.log('ключи очищены');
                                }, 2500);
                              }
                            })
                          );
                        }
                      }
                    );
                  }
                })
              );
            }
          }

          if (num < allPages) {
            num++;
            const nextUrl = `https://sis.nipo.gov.ua/api/v1/open-data/?obj_type=4&page=${num}`;
            fetchData(nextUrl).then(resolve).catch(reject);
          } else {
            console.log('Такого в базе данных нет');
            resolve();
          }
        })
        .catch((error) => {
          console.error('Ошибка при загрузке данных:', error);
          reject(error);
        });
    }, 15000);
  });
};

const startAllRecord = initialUrl + `page=${num}`;

fetchData(startAllRecord);

// fetchData(startAllRecord);

// ежедневная проверка и загрузка новых обновлений по торговым маркам
const lastUpdateMark = () => {
  const sqllastDate = `SELECT * FROM marks_info`;

  connection.query(sqllastDate, (err, results) => {
    if (err) console.log(err);
    // берем данные из last_update (последней записи в бд) и превращаем в нужную нам дату
    let date = new Date(results[results.length - 1].last_update);
    let day = date.getDate().toString().padStart(2, '0');
    let month = (date.getMonth() + 1).toString().padStart(2, '0');
    let year = date.getFullYear();
    lastUpdate = `${day}.${month}.${year}`;
    console.log('>>>>>>>>lastdate', lastUpdate, results[results.length - 1].number);

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        fetch(
          `http://sis.nipo.gov.ua/api/v1/open-data/?last_update_from=${lastUpdate}&obj_type=4&page=${num}`
        )
          .then((res) => res.json())
          .then((data) => {
            for (const result of data.results) {
              const createTableMarks_info = `
              INSERT INTO marks_info (name_marks, name_applicant, address_applicant, name_owner, address_owner, number, registration_number,  status,   adress_img, last_update) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
              const values = [
                result.data.WordMarkSpecification.MarkSignificantVerbalElement[0]['#text'],
                result.data.HolderDetails !== undefined
                  ? result.data.HolderDetails.Holder[0].HolderAddressBook.FormattedNameAddress.Name
                      .FreeFormatName.FreeFormatNameDetails.FreeFormatNameLine
                  : '* - інформація тимчасово обмежена',
                result.data.HolderDetails !== undefined
                  ? result.data.HolderDetails.Holder[0].HolderAddressBook.FormattedNameAddress
                      .Address.FreeFormatAddress.FreeFormatAddressLine
                  : '* - інформація тимчасово обмежена',
                result.data.ApplicantDetails !== undefined
                  ? result.data.ApplicantDetails.Applicant[0].ApplicantAddressBook
                      .FormattedNameAddress.Name.FreeFormatName.FreeFormatNameDetails
                      .FreeFormatNameLine
                  : '* - інформація тимчасово обмежена',
                result.data.ApplicantDetails !== undefined
                  ? result.data.ApplicantDetails.Applicant[0].ApplicantAddressBook
                      .FormattedNameAddress.Address.FreeFormatAddress.FreeFormatAddressLine
                  : '* - інформація тимчасово обмежена',
                result.data.ApplicationNumber,
                result.data.RegistrationNumber,
                result.data.registration_status_color,
                result.data.MarkImageDetails.MarkImage.MarkImageFilename,
                result.last_update,
              ];
              arrName.push(values);
              if (arrName.length === 10) {
                arrName.forEach((arr) =>
                  connection.query(createTableMarks_info, arr, (err, results) => {
                    if (err) {
                      console.error('Ошибка при добавлении данных:', err);
                    } else {
                      console.log('Данные успешно добавлены');
                      setTimeout(() => {
                        arrName.splice(0, arrName.length);
                        console.log('имена марок очищены');
                        // Очистка массива
                      }, 2500);
                      const classDescription =
                        result.data.GoodsServicesDetails.GoodsServices.ClassDescriptionDetails
                          .ClassDescription[0];
                      const classNumber = classDescription.ClassNumber;

                      classDescription.ClassificationTermDetails.ClassificationTerm.forEach(
                        (term) => {
                          const termText = term.ClassificationTermText;

                          const createTableNumberKeys = `INSERT INTO number_class (number_class, class_info, mark_id) VALUES (?, ?, ?)`;
                          const values = [classNumber, termText, results.insertId];
                          arrKeysInfo.push(values);

                          if (arrKeysInfo.length === arrKeysInfo.length) {
                            arrKeysInfo.forEach((arr) =>
                              connection.query(createTableNumberKeys, arr, (err) => {
                                if (err) {
                                  console.error(
                                    'Ошибка при добавлении данных в таблицу номеров ключей',
                                    err
                                  );
                                } else {
                                  console.log('Данные в таблицу ключей добавлены');
                                  setTimeout(() => {
                                    arrKeysInfo.splice(0, arrName.length);
                                    console.log('ключи очищены');
                                  }, 2500);
                                }
                              })
                            );
                          }
                        }
                      );
                    }
                  })
                );
              }
            }

            if (num < allPages) {
              num++;
              const nextUrl = `http://sis.nipo.gov.ua/api/v1/open-data/?last_update_from=${lastUpdate}&obj_type=4&page=${num}`;
              fetchData(nextUrl).then(resolve).catch(reject);
            } else {
              console.log('Такого в базе данных нет');
              resolve();
            }
          })
          .catch((error) => {
            console.error('Ошибка при загрузке данных:', error);
            reject(error);
          });
      }, 15000);
    });
  });
};
// lastUpdateMark();
// запуск функции в определнное время в 23 часа
// cron.schedule('0 23 * * *', lastUpdateMark);
// function showTimer() {
//   const now = new Date();
//   const targetTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 0, 0);
//   const diff = targetTime - now;
//   const hours = Math.floor(diff / (1000 * 60 * 60));
//   const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
//   const seconds = Math.floor((diff % (1000 * 60)) / 1000);

//   console.log(`До старта осталось: ${hours} ч. ${minutes} мин. ${seconds} сек.`);
// }
// setInterval(showTimer, 1000);

//
app.listen(PORT, () => {
  console.log('START', PORT);
});
