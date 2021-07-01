# frozen_string_literal: true

class OrganizationUsersController < ApplicationController
  before_action :authorize_org_user, except: :create
  attr_reader :org_user

  def create
    authorize OrganizationUser

    first_name = params[:first_name]
    last_name = params[:last_name]
    email = params[:email]
    role = params[:role]
    password = SecureRandom.uuid
    org = @current_user.organization

    if User.find_by(email: email).present?
      render json: { message: "Email address is already taken" }, status: :unprocessable_entity
    else
      user = User.create(
        first_name: first_name,
        last_name: last_name,
        email: email,
        password: password,
        password_confirmation: password,
        organization: org,
        invitation_token: SecureRandom.uuid
      )

      org_user = OrganizationUser.new(
        role: role,
        user: user,
        organization: org
      )

      UserMailer.with(user: user, sender: @current_user).invitation_email.deliver if org_user.save
    end
  end

  def change_role
    org_user.update(role: params[:role])
  end

  def archive
    org_user.update(status: "archived")
  end

  private

    def authorize_org_user
      @org_user = OrganizationUser.find params[:organization_user_id]
      authorize org_user
    end
end
