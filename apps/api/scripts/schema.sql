CREATE TABLE users (
	id VARCHAR(36) NOT NULL, 
	email VARCHAR(255) NOT NULL, 
	password_hash VARCHAR(255) NOT NULL, 
	display_name VARCHAR(100), 
	`role` VARCHAR(16) NOT NULL, 
	is_active BOOL NOT NULL, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (email)
);

CREATE TABLE admin_audits (
	id VARCHAR(36) NOT NULL, 
	actor_id VARCHAR(36) NOT NULL, 
	target_id VARCHAR(36) NOT NULL, 
	action VARCHAR(32) NOT NULL, 
	old_role VARCHAR(16) NOT NULL, 
	new_role VARCHAR(16) NOT NULL, 
	created_at DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(actor_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE password_reset_tokens (
	id VARCHAR(36) NOT NULL, 
	user_id VARCHAR(36) NOT NULL, 
	token VARCHAR(128) NOT NULL, 
	expires_at DATETIME NOT NULL, 
	used BOOL NOT NULL, 
	created_at DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE, 
	UNIQUE (token)
);

CREATE TABLE projects (
	id VARCHAR(36) NOT NULL, 
	user_id VARCHAR(36) NOT NULL, 
	title VARCHAR(255) NOT NULL, 
	slug VARCHAR(255), 
	idea TEXT, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE, 
	UNIQUE (slug)
);

CREATE TABLE documents (
	id VARCHAR(36) NOT NULL, 
	project_id VARCHAR(36) NOT NULL, 
	user_id VARCHAR(36) NOT NULL, 
	type VARCHAR(32) NOT NULL, 
	tone VARCHAR(16) NOT NULL, 
	depth VARCHAR(16) NOT NULL, 
	title VARCHAR(255) NOT NULL, 
	status VARCHAR(16) NOT NULL, 
	generation_model VARCHAR(128) NOT NULL, 
	humanize_model VARCHAR(128) NOT NULL, 
	human_score_avg NUMERIC(5, 2), 
	tokens_used_json TEXT, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(project_id) REFERENCES projects (id) ON DELETE CASCADE, 
	FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE exports (
	id VARCHAR(36) NOT NULL, 
	document_id VARCHAR(36) NOT NULL, 
	user_id VARCHAR(36) NOT NULL, 
	format VARCHAR(8) NOT NULL, 
	path VARCHAR(512), 
	cloudinary_public_id VARCHAR(255), 
	secure_url VARCHAR(512), 
	pages INTEGER, 
	words_total INTEGER, 
	created_at DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(document_id) REFERENCES documents (id) ON DELETE CASCADE, 
	FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE sections (
	id VARCHAR(36) NOT NULL, 
	document_id VARCHAR(36) NOT NULL, 
	title VARCHAR(255) NOT NULL, 
	order_idx INTEGER NOT NULL, 
	content_md TEXT NOT NULL, 
	content_humanized_md TEXT, 
	word_count INTEGER NOT NULL, 
	ai_score NUMERIC(5, 2), 
	human_score NUMERIC(5, 2), 
	iteration INTEGER NOT NULL, 
	mermaid_svg TEXT, 
	PRIMARY KEY (id), 
	FOREIGN KEY(document_id) REFERENCES documents (id) ON DELETE CASCADE
);

CREATE TABLE versions (
	id VARCHAR(36) NOT NULL, 
	document_id VARCHAR(36) NOT NULL, 
	version_no INTEGER NOT NULL, 
	snapshot_json TEXT NOT NULL, 
	created_at DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(document_id) REFERENCES documents (id) ON DELETE CASCADE
);

CREATE TABLE user_models (
	id VARCHAR(36) NOT NULL,
	user_id VARCHAR(36) NOT NULL,
	model_id VARCHAR(128) NOT NULL,
	enabled BOOLEAN NOT NULL DEFAULT TRUE,
	added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY (id),
	UNIQUE KEY uq_user_model (user_id, model_id),
	FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
);
