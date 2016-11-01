const {EventEmitter} = Npm.require('events');

const baseName = 'rocketchat_';

const trash = new Mongo.Collection(baseName + '_trash');
try {
	trash._ensureIndex({ collection: 1 });
	trash._ensureIndex({ _deletedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });
} catch (e) {
	console.log(e);
}

class ModelsBase extends EventEmitter {
	constructor(model) {
		super();

		if (Match.test(model, String)) {
			this.name = model;
			this.collectionName = this.baseName + this.name;
			this.model = new Mongo.Collection(this.collectionName);
		} else {
			this.name = model._name;
			this.collectionName = this.name;
			this.model = model;
		}

		this.tryEnsureIndex({ '_updatedAt': 1 });
	}

	get baseName() {
		return baseName;
	}

	setUpdatedAt(record = {}, checkQuery = false, query) {
		if (checkQuery === true) {
			if (!query || Object.keys(query).length === 0) {
				throw new Meteor.Error('Models._Base: Empty query');
			}
		}

		if (/(^|,)\$/.test(Object.keys(record).join(','))) {
			record.$set = record.$set || {};
			record.$set._updatedAt = new Date;
		} else {
			record._updatedAt = new Date;
		}

		return record;
	}

	find() {
		return this.model.find(...arguments);
	}

	findOne() {
		return this.model.findOne(...arguments);
	}

	insert(record) {
		this.setUpdatedAt(record);

		const result = this.model.insert(...arguments);
		record._id = result;
		this.emit('insert', record);
		this.emit('change', 'insert', record);
		return result;
	}

	update(query, update, options = {}) {
		this.setUpdatedAt(update, true, query);

		if (options.upsert) {
			return this.upsert(query, update);
		}

		let ids = [];
		if (options.multi === true) {
			const updated = this.model.find(query, { fields: { _id: 1 } }).fetch();
			if (updated) {
				ids = ids.concat(updated);
			}
		} else {
			const updated = this.model.findOne(query, { fields: { _id: 1 } });
			if (updated) {
				ids.push(updated);
			}
		}

		const result = this.model.update(query, update, options);
		const idQuery = { _id: { $in: _.pluck(ids, '_id') } };
		this.emit('update', idQuery, update);
		this.emit('change', 'update', idQuery, update);
		return result;
	}

	upsert(query, update) {
		this.setUpdatedAt(update, true, query);

		const id = this.model.findOne(query, { fields: { _id: 1 } });
		const result = this.model.upsert(...arguments);

		let record = id;
		if (result.insertedId) {
			record = { _id: result.insertedId };
		}

		this.emit('update', record);
		this.emit('change', 'update', record);
		return result;
	}

	remove(query) {
		const records = this.model.find(query).fetch();

		const ids = [];
		for (const record of records) {
			ids.push(record._id);

			record._deletedAt = new Date;
			record.__collection__ = this.name;

			trash.upsert({_id: record._id}, _.omit(record, '_id'));
		}

		query = { _id: { $in: ids } };

		this.emit('remove', records);
		this.emit('change', 'remove', records);
		return this.model.remove(query);
	}

	insertOrUpsert(...args) {
		if (args[0] && args[0]._id) {
			const _id = args[0]._id;
			delete args[0]._id;
			args.unshift({
				_id: _id
			});

			this.upsert(...args);
			return _id;
		} else {
			return this.insert(...args);
		}
	}

	allow() {
		return this.model.allow(...arguments);
	}

	deny() {
		return this.model.deny(...arguments);
	}

	ensureIndex() {
		return this.model._ensureIndex(...arguments);
	}

	dropIndex() {
		return this.model._dropIndex(...arguments);
	}

	tryEnsureIndex() {
		try {
			return this.ensureIndex(...arguments);
		} catch (e) {
			console.log(e);
		}
	}

	tryDropIndex() {
		try {
			return this.dropIndex(...arguments);
		} catch (e) {
			console.log(e);
		}
	}

	getChangedRecords(type, recordOrQuery, fields) {
		if (type === 'insert') {
			return [recordOrQuery];
		}

		if (type === 'remove') {
			return recordOrQuery;
		}

		if (type === 'update') {
			const options = {};
			if (fields) {
				options.fields = fields;
			}
			return this.find(recordOrQuery, options).fetch();
		}
	}

	trashFind(query, options) {
		query.__collection__ = this.name;

		return trash.find(query, options);
	}

	trashFindDeletedAfter(deletedAt, query = {}, options) {
		query.__collection__ = this.name;
		query._deletedAt = {
			$gt: deletedAt
		};

		return trash.find(query, options);
	}

	dinamicTrashFindAfter(method, deletedAt, ...args) {
		const scope = {
			find: (query={}) => {
				return this.trashFindDeletedAfter(deletedAt, query, { fields: {_id: 1, _deletedAt: 1} });
			}
		};

		scope.model = {
			find: scope.find
		};

		return this[method].apply(scope, args);
	}

	dinamicFindAfter(method, updatedAt, ...args) {
		const scope = {
			find: (query={}, options) => {
				query._updatedAt = {
					$gt: updatedAt
				};

				return this.find(query, options);
			}
		};

		scope.model = {
			find: scope.find
		};

		return this[method].apply(scope, args);
	}

	dinamicFindChangesAfter(method, updatedAt, ...args) {
		return {
			update: this.dinamicFindAfter(method, updatedAt, ...args).fetch(),
			remove: this.dinamicTrashFindAfter(method, updatedAt, ...args).fetch()
		};
	}

}

RocketChat.models._Base = ModelsBase;
