from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token
from app.core.deps import get_current_user
from app.models.company import Company, PricingTier
from app.models.user import User, UserRole
from app.models.audit_log import AuditActorType, AuditStatus
from app.schemas.user import UserRegister, UserResponse
from app.schemas.auth import Token
from app.services.audit_logger import log_audit

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(user_in: UserRegister, request: Request, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )
    
    company_name = user_in.company_name or f"{user_in.full_name or 'User'}'s Business"
    new_company = Company(
        name=company_name,
        pricing_tier=PricingTier.BASIC
    )
    db.add(new_company)
    db.commit()
    db.refresh(new_company)

    # Creating A New User using above default company
    new_user = User(
        company_id=new_company.id,
        email=user_in.email,
        hashed_password=hash_password(user_in.password),
        full_name=user_in.full_name,
        role=UserRole.ADMIN  # First registering user is Company Admin
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    access_token = create_access_token(subject=new_user.id)

    log_audit(
        db=db,
        company_id=new_company.id,
        action="register",
        resource_type="auth",
        resource_id=new_user.id,
        actor_type=AuditActorType.USER,
        actor_id=new_user.id,
        actor_name=new_user.email,
        details={"company_name": company_name, "pricing_tier": new_company.pricing_tier.value},
        status=AuditStatus.SUCCESS,
        ip_address=request.client.host if request.client else None,
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(new_user)
    )

@router.post("/login", response_model=Token)
def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):

    ip = request.client.host if request.client else None
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        if user is not None:
            log_audit(
                db=db,
                company_id=user.company_id,
                action="login",
                resource_type="auth",
                actor_type=AuditActorType.USER,
                actor_name=form_data.username,
                details={"reason": "invalid_credentials"},
                status=AuditStatus.FAILURE,
                ip_address=ip,
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    if not user.is_active:
        log_audit(
            db=db,
            company_id=user.company_id,
            action="login",
            resource_type="auth",
            actor_id=user.id,
            actor_name=user.email,
            details={"reason": "inactive_account"},
            status=AuditStatus.FAILURE,
            ip_address=ip,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User account is inactive"
        )

    access_token = create_access_token(subject=user.id)

    log_audit(
        db=db,
        company_id=user.company_id,
        action="login",
        resource_type="auth",
        actor_id=user.id,
        actor_name=user.email,
        status=AuditStatus.SUCCESS,
        ip_address=ip,
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)
