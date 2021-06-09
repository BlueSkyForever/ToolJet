# frozen_string_literal: true

# == Schema Information
#
# Table name: users
#
#  id               :uuid             not null, primary key
#  email            :string
#  first_name       :string
#  image            :text
#  invitation_token :string
#  last_name        :string
#  password_digest  :string
#  role             :string
#  created_at       :datetime         not null
#  updated_at       :datetime         not null
#  organization_id  :uuid
#
# Indexes
#
#  index_users_on_organization_id  (organization_id)
#
class User < ApplicationRecord
  has_secure_password
  has_many :organization_users
  belongs_to :organization
  has_many :app_users
  has_many :apps

  validates :email, presence: true, uniqueness: true
  validates :email, format: { with: URI::MailTo::EMAIL_REGEXP }

  def org_admin?
    organization_users.find_by(organization_id: organization_id).admin?
  end

  def org_developer?
    organization_users.find_by(organization_id: organization_id).developer?
  end

  def org_viewer?
    organization_users.find_by(organization_id: organization_id).viewer?
  end

  def app_admin?(app)
    app_users.find_by(app_id: app.id)&.admin?
  end

  def app_developer?(app)
    app_users.find_by(app_id: app.id)&.developer?
  end

  def app_viewer?(app)
    app_users.find_by(app_id: app.id)&.viewer?
  end
end
