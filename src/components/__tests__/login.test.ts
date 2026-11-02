import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createPinia, disposePinia, setActivePinia, type Pinia } from 'pinia';
import { createMemoryHistory, createRouter, type Router } from 'vue-router';
import { mount, flushPromises } from '@vue/test-utils';
import LoginView from '@/views/LoginView.vue';
import { useAuthStore } from '@/stores/useAuthStore';

const sdk = vi.hoisted(() => ({ signInWithPassword:vi.fn(),signUp:vi.fn(),resend:vi.fn() }));
vi.mock('@/services/AuthService',()=>({authService:{getClient:()=>({auth:sdk})}}));
const profiles = vi.hoisted(() => ({ usernameAvailable: vi.fn() }));
vi.mock('@/services/ProfileApiService',()=>({profileApi:profiles}));
import { CURRENT_TERMS_VERSION } from '@account-rules';
let pinia:Pinia; let router:Router; let view:ReturnType<typeof mount>; let auth:ReturnType<typeof useAuthStore>;
beforeEach(async()=>{
  vi.resetAllMocks(); pinia=createPinia();setActivePinia(pinia);auth=useAuthStore();auth.enabled=true;auth.ready=true;
  vi.spyOn(auth,'initialize').mockResolvedValue();
  vi.spyOn(auth,'refreshAccount').mockImplementation(async()=>{auth.account={id:'alice',isAdmin:false};});
  router=createRouter({history:createMemoryHistory(),routes:[{path:'/login',name:'login',component:LoginView},{path:'/database',component:{template:'<div />'}},{path:'/timeline',component:{template:'<div />'}},{path:'/legal/:page',name:'legal',component:{template:'<div />'}},{path:'/reset-password',name:'password-reset',component:{template:'<div />'}}]});
  await router.push('/login?redirect=/database');await router.isReady();
  view=mount(LoginView,{global:{plugins:[pinia,router]},attachTo:document.body});
  sdk.signInWithPassword.mockResolvedValue({data:{session:{access_token:'test-token'}},error:null});
  profiles.usernameAvailable.mockResolvedValue(true);
});
afterEach(()=>{view.unmount();router.options.history.destroy();disposePinia(pinia);vi.restoreAllMocks();});
async function fill(){await view.get('#account-email').setValue('user@example.test');await view.get('#account-password').setValue('local-test-password');}
/** Sign-up also needs a free username (checked after a pause) and the accepted terms. */
async function fillSignup(name='Explorer'){
  vi.useFakeTimers({toFake:['setTimeout','clearTimeout']});
  await fill();await view.get('#account-username').setValue(name);await view.get('.account-terms input').setValue(true);
  vi.advanceTimersByTime(500);vi.useRealTimers();await flushPromises();
}
it('uses native email/password controls and returns to the requested local workspace after verification',async()=>{
  expect(view.get('#account-email').attributes('autocomplete')).toBe('email');
  expect(view.get('#account-password').attributes('type')).toBe('password');
  await fill();await view.get('form').trigger('submit');await flushPromises();
  expect(sdk.signInWithPassword).toHaveBeenCalledExactlyOnceWith({email:'user@example.test',password:'local-test-password'});
  expect(auth.refreshAccount).toHaveBeenCalledOnce();expect(router.currentRoute.value.path).toBe('/database');
});
it('shows a safe error for invalid credentials without navigating or displaying SDK details',async()=>{
  sdk.signInWithPassword.mockResolvedValue({error:{message:'private provider details'}});
  await fill();await view.get('form').trigger('submit');await flushPromises();
  expect(view.get('[role="alert"]').text()).toContain('Vérifiez vos identifiants');expect(view.text()).not.toContain('private provider');
  expect(router.currentRoute.value.path).toBe('/login');expect(auth.refreshAccount).not.toHaveBeenCalled();
});
it('handles email confirmation without claiming that an account is already connected',async()=>{
  await view.findAll('button').find(b=>b.text()==='Créer un compte')!.trigger('click');await flushPromises();await fillSignup();
  sdk.signUp.mockResolvedValue({data:{session:null},error:null});await view.get('form').trigger('submit');await flushPromises();
  expect(sdk.signUp.mock.calls[0][0].options.emailRedirectTo).toBe(`${window.location.origin}/login?confirmed=1`);
  // The form gives way to an explicit next step, focused so that the change is noticed and announced.
  expect(view.find('form').exists()).toBe(false);
  expect(view.get('h2').text()).toBe('Vérifiez votre boîte mail');expect(document.activeElement).toBe(view.get('h2').element);
  expect(view.get('[role="status"]').text()).toContain('user@example.test');expect(auth.refreshAccount).not.toHaveBeenCalled();
  expect(router.currentRoute.value.path).toBe('/login');
  sdk.resend.mockResolvedValue({data:{},error:null});
  await view.findAll('button').find(b=>b.text()==='Renvoyer l’e-mail')!.trigger('click');await flushPromises();
  expect(sdk.resend).toHaveBeenCalledExactlyOnceWith({type:'signup',email:'user@example.test',options:{emailRedirectTo:`${window.location.origin}/login?confirmed=1`}});
  expect(view.text()).toContain('Un nouveau lien a été envoyé');
  await view.findAll('button').find(b=>b.text()==='J’ai confirmé, me connecter')!.trigger('click');await flushPromises();
  expect(router.currentRoute.value.query.mode).toBeUndefined();expect(view.get('h2').text()).toBe('Se connecter');
  expect((view.get('#account-email').element as HTMLInputElement).value).toBe('user@example.test');
});
it('offers a new confirmation link when signing in with an unconfirmed address',async()=>{
  sdk.signInWithPassword.mockResolvedValue({error:{code:'email_not_confirmed',message:'private'}});
  await fill();await view.get('form').trigger('submit');await flushPromises();
  expect(view.get('[role="alert"]').text()).toContain('pas encore confirmée');expect(view.text()).not.toContain('private');
  sdk.resend.mockResolvedValue({error:{code:'over_email_send_rate_limit'}});
  await view.findAll('button').find(b=>b.text()==='Renvoyer le lien de confirmation')!.trigger('click');await flushPromises();
  expect(sdk.resend).toHaveBeenCalledOnce();expect(view.text()).toContain('limite d’envoi');
});
it.each([
  [{code:'weak_password'}, 'mot de passe est trop faible'],
  [{name:'AuthWeakPasswordError'}, 'mot de passe est trop faible'],
  [{code:'email_address_not_authorized'}, 'service d’e-mail du projet'],
  [{code:'over_email_send_rate_limit'}, 'limite d’envoi'],
  [{code:'over_request_rate_limit'}, 'Trop de tentatives'],
  [{code:'email_address_invalid'}, 'adresse e-mail n’est pas acceptée'],
  [{code:'signup_disabled'}, 'inscriptions par e-mail sont actuellement désactivées'],
  [{code:'email_provider_disabled'}, 'inscriptions par e-mail sont actuellement désactivées'],
  [{code:'unexpected_failure'}, 'vient d’être pris'],
  [{code:'user_already_exists'}, 'Création du compte impossible'],
  [{}, 'Création du compte impossible'],
])('explains safe signup failures from their code without leaking provider details: %j',async(providerError,expected)=>{
  await view.findAll('button').find(b=>b.text()==='Créer un compte')!.trigger('click');await flushPromises();await fillSignup();
  sdk.signUp.mockResolvedValue({error:{...providerError,message:'private provider details'}});
  await view.get('form').trigger('submit');await flushPromises();
  expect(view.get('[role="alert"]').text()).toContain(expected);
  expect(view.text()).not.toContain('private provider');
  expect(view.find('[role="status"]').exists()).toBe(false);
  expect(router.currentRoute.value.path).toBe('/login');expect(auth.refreshAccount).not.toHaveBeenCalled();
  expect(view.get('button[type="submit"]').attributes('disabled')).toBeUndefined();
});
it('preserves plus-address aliases and links password guidance only to signup',async()=>{
  expect(view.find('#account-password-hint').exists()).toBe(false);
  await view.findAll('button').find(b=>b.text()==='Créer un compte')!.trigger('click');await flushPromises();await fillSignup();
  expect(view.get('#account-password').attributes('aria-describedby')).toBe('account-password-hint');
  expect(view.get('#account-password-hint').text()).toContain('compromis');
  await view.get('#account-email').setValue('  user+test@example.test  ');
  sdk.signUp.mockResolvedValue({data:{session:null},error:null});await view.get('form').trigger('submit');await flushPromises();
  expect(sdk.signUp).toHaveBeenCalledExactlyOnceWith({email:'user+test@example.test',password:'local-test-password',options:{emailRedirectTo:`${window.location.origin}/login?confirmed=1`,data:{username:'Explorer',terms_version:CURRENT_TERMS_VERSION}}});
  await view.findAll('button').find(b=>b.text()==='J’ai confirmé, me connecter')!.trigger('click');await flushPromises();
  expect(view.find('#account-password-hint').exists()).toBe(false);
  expect(view.get('#account-password').attributes('aria-describedby')).toBeUndefined();
});
it('prevents duplicate submissions and ignores a late result after leaving the page',async()=>{
  let complete!:(value:unknown)=>void;sdk.signInWithPassword.mockReturnValue(new Promise(yes=>{complete=yes;}));
  await fill();await view.get('form').trigger('submit');await view.get('form').trigger('submit');await flushPromises();
  expect(sdk.signInWithPassword).toHaveBeenCalledOnce();const replace=vi.spyOn(router,'replace');view.unmount();
  complete({data:{session:{}},error:null});await flushPromises();
  expect(auth.refreshAccount).not.toHaveBeenCalled();expect(replace).not.toHaveBeenCalled();
});
it('keeps signup and login inactive before the migration is activated',async()=>{
  auth.enabled=false;await flushPromises();expect(view.find('form').exists()).toBe(false);
  expect(view.get('[role="status"]').text()).toContain('mise en place des accès');
});

it('leaves the login page when confirmation has restored a session before the page mounts',async()=>{
  view.unmount();await router.push('/login?redirect=/database');
  auth.account={id:'alice',isAdmin:false};
  view=mount(LoginView,{global:{plugins:[pinia,router]}});await flushPromises();
  expect(router.currentRoute.value.path).toBe('/database');
  expect(sdk.signInWithPassword).not.toHaveBeenCalled();
});

it('opens signup directly and clears the password when the header switches back to login',async()=>{
  await router.push('/login?mode=signup&redirect=/database');await flushPromises();
  expect(view.get('h2').text()).toBe('Créer un compte');
  expect(view.get('#account-password').attributes('autocomplete')).toBe('new-password');
  await view.get('#account-password').setValue('local-test-password');
  await router.push('/login?redirect=/database');await flushPromises();
  expect(view.get('h2').text()).toBe('Se connecter');
  expect(view.get('#account-password').element.value).toBe('');
  expect(view.get('#account-password').attributes('autocomplete')).toBe('current-password');
});

it('waits for account verification before returning to a protected destination',async()=>{
  auth.ready=false;auth.account={id:'alice',isAdmin:false};await flushPromises();
  expect(router.currentRoute.value.path).toBe('/login');
  auth.ready=true;await flushPromises();
  expect(router.currentRoute.value.path).toBe('/database');
});

it('requires a free, valid username and the accepted terms before creating an account',async()=>{
  await view.findAll('button').find(b=>b.text()==='Créer un compte')!.trigger('click');await flushPromises();
  profiles.usernameAvailable.mockResolvedValue(false);await fillSignup('Pris');
  expect(view.text()).toContain('déjà pris');expect(view.get('button[type="submit"]').attributes('disabled')).toBeDefined();
  profiles.usernameAvailable.mockResolvedValue(true);await fillSignup('a b');
  expect(view.get('#account-username').attributes('aria-invalid')).toBe('true');
  await fillSignup('Explorer');await view.get('.account-terms input').setValue(false);
  await view.get('form').trigger('submit');await flushPromises();
  expect(sdk.signUp).not.toHaveBeenCalled();
  expect(view.findAll('.account-terms a').map(link=>link.attributes('href'))).toEqual(['/legal/conditions','/legal/confidentialite']);
});
it('welcomes the return from the confirmation link',async()=>{
  view.unmount();await router.push('/login?confirmed=1');
  view=mount(LoginView,{global:{plugins:[pinia,router]},attachTo:document.body});await flushPromises();
  expect(view.get('[role="status"]').text()).toContain('Adresse e-mail confirmée');
});
