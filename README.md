# Simple Todo API

A simple todo list API with the following functional requirement:

1. Add a to-do
2. Change a to-do
3. Delete a to-do (do a soft delete)
4. List all todos
5. Return a todo
6. login
7. return a user

## Getting Started

A guide on how to run the application in a new environment

### Development
- Create a `.env` file with the content of `.env.template`.
- `npm install`
- `npm run prisma:migrate`
- `npm run dev`

### Production

- Set all the environment variable provided in the `.env.template`.
- `npm install`
- `npm run prisma:migrate`
- `npm run build`
- `npm start`

### Testing

- Create a `.env` file with the content of `.env.template`.
- Set the `DATABASE_URL` key in the `.env` file to `file:./test.db`
- `npm install`
- `npm run prisma:migrate`
- `npm run test`
- `npm run coverage`

## Endpoints
RESTful endpoint for managing user and todos.

### Users

Handles creating and authorising user.

#### `GET /users/me`

Retrieves the user details of an authenticated user. In order to authenticate, see `POST /users/login`.

```http request
GET http://localhost:5000/users/me
Authorization: Bearer ACCESS_TOKEN
```

```json
{
  "id": "34a20bc5-7859-4366-92e3-a1bdc58d62ae",
  "email": "samuelomohan@gmail.com"
}
```

#### `POST /users/`

Creates a new user.

```http request
POST http://localhost:5000/users/
Content-Type: application/json

{
  "email": "samuelomohan@gmail.com",
  "password": "secret-password"
}
```

```json
{
  "email": "samuelomohan@gmail.com",
  "id": "34a20bc5-7859-4366-92e3-a1bdc58d62ae"
}
```

#### `POST /users/login`

Authenticates and authorises user. Inorder to create an account, see `POST /users/`

```http request
POST http://localhost:5000/users/login
Content-Type: application/json

{
  "email": "samuelomohan@gmail.com",
  "password": "secret-password"
}
```

```json
{
  "accessToken": "ACCESS_TOKEN"
}
```

#### `POST /users/tokens/refresh`

Refreshes access token.

```http request
POST http://localhost:5000/users/tokens/refresh
Cookie: "refreshToken=REFRESH_TOKEN"
```

```json
{
  "accessToken": "ACCESS_TOKEN"
}
```

### Todos

Handles creating, updating, reading and deleting todos.

#### `GET /todos/`

Retrieve todos.

```http request
GET http://localhost:5000/todos/
Authorization: Bearer ACCESS_TOKEN
```

```json
[
  {
    "id": "9240fc20-caf0-447e-8316-a40610baee84",
    "content": "task",
    "completed": false,
    "deleted": false,
    "ownerId": "34a20bc5-7859-4366-92e3-a1bdc58d62ae"
  },
  {
    "id": "55797cf2-f07c-4bec-9732-ac8aa4ad27c9",
    "content": "task",
    "completed": false,
    "deleted": false,
    "ownerId": "34a20bc5-7859-4366-92e3-a1bdc58d62ae"
  }
]

```

#### `GET /todos/:id`

Retrieves a todo.

```http request
GET http://localhost:5000/todos/55797cf2-f07c-4bec-9732-ac8aa4ad27c9
Authorization: Bearer ACCESS_TOKEN
```

```json
{
  "id": "55797cf2-f07c-4bec-9732-ac8aa4ad27c9",
  "content": "task",
  "completed": false,
  "deleted": false,
  "ownerId": "34a20bc5-7859-4366-92e3-a1bdc58d62ae"
}
```

#### `POST /todos/`

Creates a todo.

```http request
POST http://localhost:5000/todos/
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json

{
  "content": "task"
}
```

```json
{
  "id": "55797cf2-f07c-4bec-9732-ac8aa4ad27c9",
  "content": "task",
  "completed": false,
  "deleted": false,
  "ownerId": "34a20bc5-7859-4366-92e3-a1bdc58d62ae"
}
```

#### `PUT /todos/:id`

Updates `content` and `completed`.

```http request
PUT http://localhost:5000/todos/55797cf2-f07c-4bec-9732-ac8aa4ad27c9
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json

{
  "content": "updated task",
  "completed": true
}
```

```json
{
  "id": "55797cf2-f07c-4bec-9732-ac8aa4ad27c9",
  "content": "updated task",
  "completed": true,
  "deleted": false,
  "ownerId": "34a20bc5-7859-4366-92e3-a1bdc58d62ae"
}
```

#### `DELETE /todos/:id`

Soft deletes a todo.

```http request
DELETE http://localhost:5000/todos/55797cf2-f07c-4bec-9732-ac8aa4ad27c9
Authorization: Bearer ACCESS_TOKEN
```

```
204 (No Content)
```
