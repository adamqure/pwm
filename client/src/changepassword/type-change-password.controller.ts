/*
 * Password Management Servlets (PWM)
 * http://www.pwm-project.org
 *
 * Copyright (c) 2006-2009 Novell, Inc.
 * Copyright (c) 2009-2017 The PWM Project
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
 */


import {IHelpDeskService, ISuccessResponse} from '../services/helpdesk.service';
import {IQService, IScope, IWindowService} from 'angular';
import {IHelpDeskConfigService} from '../services/helpdesk-config.service';
import DialogService from '../ux/ias-dialog.service';
import {IChangePasswordSuccess} from './success-change-password.controller';
import {IPasswordService, IValidatePasswordData} from '../services/password.service';

require('changepassword/type-change-password.component.scss');

const EMPTY_MATCH_STATUS = 'EMPTY';

export default class TypeChangePasswordController {
    passwordAcceptable: boolean;
    maskPasswords: boolean;
    matchStatus: string;
    message: string;
    password1: string;
    password2: string;
    passwordMasked: boolean;
    passwordUiMode: string;
    passwordSuggestions: string[];
    showStrengthMeter: boolean;
    strength: number;

    static $inject = [
        '$q',
        '$scope',
        '$window',
        'ConfigService',
        'HelpDeskService',
        'IasDialogService',
        'PasswordService',
        'personUsername',
        'personUserKey',
        'translateFilter'
    ];
    constructor(private $q: IQService,
                private $scope: IScope,
                private $window: IWindowService,
                private configService: IHelpDeskConfigService,
                private HelpDeskService: IHelpDeskService,
                private IasDialogService: DialogService,
                private passwordService: IPasswordService,
                private personUsername: string,
                private personUserKey: string,
                private translateFilter: (id: string) => string) {
        this.password1 = '';
        this.password2 = '';
        this.passwordAcceptable = true;
        this.passwordSuggestions = Array(20).fill('');
        this.matchStatus = EMPTY_MATCH_STATUS;
        this.message = translateFilter('Display_PasswordPrompt');
        this.showStrengthMeter = HelpDeskService.showStrengthMeter;
        this.strength = 0;

        let promise = this.$q.all([
            this.configService.getPasswordUiMode(),
            this.configService.maskPasswordsEnabled()
        ]);
        promise.then((result) => {
            this.passwordUiMode = result[0];
            this.maskPasswords = result[1];
            this.passwordMasked = this.maskPasswords;
        });

        // Update dialog whenever a password field changes
        this.$scope.$watch('$ctrl.password1', (newValue, oldValue) => {
            if (newValue !== oldValue) {
                if (this.password2.length) {
                    this.password2 = '';
                }

                this.updateDialog();
            }
        });

        this.$scope.$watch('$ctrl.password2', (newValue, oldValue) => {
            if (newValue !== oldValue) {
                this.updateDialog();
            }
        });
    }

    chooseTypedPassword() {
        if (!this.passwordAcceptable) {
            return;
        }

        this.HelpDeskService.setPassword(this.personUserKey, false, this.password1)
            .then((result: ISuccessResponse) => {
                // Send the password and success message to the parent element via the close() method.
                let data: IChangePasswordSuccess = { password: this.password1, successMessage: result.successMessage };
                this.IasDialogService.close(data);
            });
    }

    // Use the autogenPasswords property to signify to the parent element that the operator clicked "Random Passwords"
    onClickRandomPasswords() {
        this.IasDialogService.close({ autogenPasswords: true });
    }

    togglePasswordMasked() {
        this.passwordMasked = !this.passwordMasked;
    }

    updateDialog() {
        this.passwordService.validatePassword(this.password1, this.password2, this.personUserKey)
            .onResult(
                (data: IValidatePasswordData) => {
                    if (data.version !== 2) {
                        // TODO: error message - '[ unexpected version string from server ]'
                    }

                    this.passwordAcceptable = data.passed && data.match === 'MATCH';
                    this.matchStatus = data.match;
                    this.message = data.message;

                    if (!this.password1) {
                        this.strength = 0;
                    }
                    if (data.strength < 20) {
                        this.strength = 1;
                    }
                    else if (data.strength < 45) {
                        this.strength = 2;
                    }
                    else if (data.strength < 70) {
                        this.strength = 3;
                    }
                    else if (data.strength < 100) {
                        this.strength = 4;
                    }
                    else {
                        this.strength = 5;
                    }
                },
                (message: string) => {
                    this.message = message;
                }
            );
    }
}
